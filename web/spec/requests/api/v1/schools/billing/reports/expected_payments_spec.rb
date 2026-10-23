# frozen_string_literal: true

require "swagger_helper"

# The expected-payments report: what each class is contracted to bring in per month, as a PDF.
# The content of the document is covered in depth by the service spec; this is the contract —
# who may read it, what it answers with, and that no school can see another's.
RSpec.describe "Api::V1::Schools::Billing::Reports::ExpectedPayments", type: :request do
  let(:school) { create(:school, name: "Colégio Exemplo") }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

  let(:fifth) do
    create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5", year: 2026)
  end
  let!(:pedro) { create(:student, school: school, school_class: fifth, name: "Pedro Silva") }
  let!(:maria) { create(:guardian, school: school, name: "Maria Silva") }
  let!(:link) do
    create(:student_guardian, school: school, student: pedro, guardian: maria, relationship: "mother")
  end
  # After the link: the payer has to be one of the child's own guardians.
  let!(:contract) do
    create(:contract, school: school, student: pedro, negotiated_amount_cents: 123_456,
                      payer_guardian: maria)
  end

  def text_of(body)
    PDF::Inspector::Text.analyze(body).strings.join(" ")
  end

  path "/api/v1/schools/{school_id}/billing/reports/expected_payments" do
    parameter name: :school_id, in: :path, type: :integer

    get "Expected payments by class (PDF)" do
      tags "Billing"
      description "A printable report, one class per page: each child, their guardians (the payer " \
                  "marked) and the monthly amount their active contract expects, with a subtotal " \
                  "per class and a grand total. Requires `manage_billing`."
      produces "application/pdf", "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_class_id, in: :query, type: :integer, required: false,
                description: "Only this class"
      parameter name: :status, in: :query, type: :string, required: false,
                description: "Student status: active (default), transferred or all"
      parameter name: :columns, in: :query, type: :string, required: false,
                description: "Comma-separated: student, guardians, plan, signature_status, " \
                             "expected_amount (default: student,guardians,expected_amount)"

      response "200", "the PDF, as an attachment" do
        run_test! do |response|
          expect(response.media_type).to eq("application/pdf")
          expect(response.headers["Content-Disposition"]).to include("attachment")
          expect(response.headers["Content-Disposition"]).to match(/valores-previstos-colegio-exemplo-\d{4}-\d{2}-\d{2}\.pdf/)
          expect(response.body).to start_with("%PDF")
          expect(text_of(response.body)).to include("Pedro Silva", "Maria Silva (pagador)", "R$ 1.234,56")
        end
      end

      response "401", "no token" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "a guardian may not read it" do
        let(:guardian_user) { create(:user) }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        before { create(:membership, user: guardian_user, school: school, role: "guardian") }

        run_test!
      end

      response "403", "staff without manage_billing may not read it" do
        let(:secretary) { create(:user) }
        let(:Authorization) { auth_headers_for(secretary)["Authorization"] }

        before do
          membership = create(:membership, :staff, user: secretary, school: school)
          template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
          create(:staff_profile, membership: membership, school: school, role_template: template)
        end

        run_test!
      end

      response "404", "another school" do
        let(:school_id) { create(:school).id }

        run_test!
      end

      response "404", "a class from another school" do
        let(:school_class_id) { create(:school_class, school: create(:school)).id }

        run_test!
      end

      response "422", "an unknown status" do
        let(:status) { "bogus" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end

  describe "behaviour beyond the contract" do
    let(:path) { "/api/v1/schools/#{school.id}/billing/reports/expected_payments" }
    let(:headers) { auth_headers_for(staff_user) }

    it "narrows to one class" do
      other_class = create(:school_class, school: school, name: "B", grade_level: "infantil_2", year: 2026)
      create(:student, school: school, school_class: other_class, name: "Zoe Alves")

      get "#{path}?school_class_id=#{fifth.id}", headers: headers

      text = text_of(response.body)
      expect(text).to include("Pedro Silva")
      expect(text).not_to include("Zoe Alves")
    end

    it "leaves another school's children out" do
      other = create(:school)
      stranger = create(:student, school: other, name: "Intruso Estranho")
      create(:contract, school: other, student: stranger)

      get path, headers: headers

      expect(text_of(response.body)).not_to include("Intruso Estranho")
    end

    it "does not print any CPF" do
      get "#{path}?columns=student,guardians,plan,signature_status,expected_amount", headers: headers

      text = text_of(response.body)
      expect(text).not_to include(maria.cpf)
      expect(text).not_to include(Cpf.format(maria.cpf))
      expect(text).not_to include(pedro.cpf)
    end

    it "is refused while the billing module is switched off" do
      create(:school_module, school: school, module_key: "billing", enabled: false)

      get path, headers: headers

      expect(response).to have_http_status(:forbidden)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
    end
  end
end
