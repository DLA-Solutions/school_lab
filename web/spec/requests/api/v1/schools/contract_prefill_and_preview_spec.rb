# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Filling a contract from the register and reading it before it goes out", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  let(:school_class) { create(:school_class, school: school, name: "A", grade_level: "fundamental_i_5") }
  let(:student) do
    create(:student, school: school, name: "Pedro Silva", school_class: school_class,
                     cpf: "52998224725", rg: "MG-14.235.789", birth_date: Date.new(2015, 3, 10))
  end
  let(:mother) do
    create(:guardian, school: school, name: "Maria Silva", email: "maria@example.com")
  end
  let(:father) { create(:guardian, school: school, name: "João Silva", email: "joao@example.com") }

  let(:prefill_path) { "/api/v1/schools/#{school.id}/billing/contracts/prefill" }

  def link(guardian, relationship, primary: false)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship, primary_guardian: primary)
  end

  describe "prefilling from the chosen student" do
    it "returns what the register already holds about them" do
      link(mother, "mother", primary: true)

      get prefill_path, params: { student_id: student.id }, headers: headers

      expect(response).to have_http_status(:ok)

      data = response.parsed_body["data"]
      expect(data.dig("student", "name")).to eq("Pedro Silva")
      expect(data.dig("student", "cpf")).to eq("52998224725")
      expect(data.dig("student", "rg")).to eq("MG-14.235.789")
      expect(data.dig("student", "birth_date")).to eq("2015-03-10")
      expect(data.dig("student", "school_class_name")).to eq("A")
      expect(data.dig("student", "grade_level")).to eq("fundamental_i_5")
    end

    it "names every guardian who will be asked to sign" do
      link(mother, "mother", primary: true)
      link(father, "father")

      get prefill_path, params: { student_id: student.id }, headers: headers

      guardians = response.parsed_body.dig("data", "guardians")
      expect(guardians.map { |row| row["name"] }).to contain_exactly("Maria Silva", "João Silva")
      expect(guardians.find { |row| row["name"] == "Maria Silva" }["primary_guardian"]).to be(true)
    end

    # The same order `Contract#payer` falls back through, so the suggestion matches what would
    # happen anyway if the field were left alone.
    it "suggests the primary guardian as the payer" do
      link(father, "father")
      link(mother, "mother", primary: true)

      get prefill_path, params: { student_id: student.id }, headers: headers

      expect(response.parsed_body.dig("data", "suggested", "payer_guardian_id")).to eq(mother.id)
    end

    it "suggests the school's only plan, and stays quiet when there is a choice" do
      link(mother, "mother")
      plan = create(:billing_plan, school: school, base_amount_cents: 85_000)

      get prefill_path, params: { student_id: student.id }, headers: headers

      suggested = response.parsed_body.dig("data", "suggested")
      expect(suggested["billing_plan_id"]).to eq(plan.id)
      expect(suggested["negotiated_amount_cents"]).to eq(85_000)

      create(:billing_plan, school: school)

      get prefill_path, params: { student_id: student.id }, headers: headers

      # Two plans is a decision the school has to make; guessing would put a family on the wrong
      # tuition.
      expect(response.parsed_body.dig("data", "suggested", "billing_plan_id")).to be_nil
    end

    # Autentique reaches a signer by e-mail and identifies them by CPF. Finding that out from a
    # rejected upload, with a family already expecting the contract, is late.
    it "reports a guardian who cannot sign, and says what is missing" do
      incomplete = create(:guardian, school: school, name: "Ana Souza")
      incomplete.update_column(:email, nil)
      link(incomplete, "mother")

      get prefill_path, params: { student_id: student.id }, headers: headers

      data = response.parsed_body["data"]
      row = data["guardians"].first
      expect(row["can_sign"]).to be(false)
      expect(row["missing"]).to include("email")
      expect(data["blocking_issues"].join).to include("Ana Souza")
    end

    it "blocks a student with nobody to sign for them" do
      get prefill_path, params: { student_id: student.id }, headers: headers

      expect(response.parsed_body.dig("data", "blocking_issues")).not_to be_empty
    end

    # Not enough to stop a send — the contract goes out with a gap someone has to fill later.
    it "warns about a student the agreement cannot fully describe" do
      link(mother, "mother")
      student.update_columns(cpf: nil, school_class_id: nil)

      get prefill_path, params: { student_id: student.id }, headers: headers

      data = response.parsed_body["data"]
      expect(data["warnings"].size).to be >= 2
      expect(data["blocking_issues"]).to be_empty
    end

    it "does not reach another school's student" do
      outsider = create(:student, school: create(:school))

      get prefill_path, params: { student_id: outsider.id }, headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "reading the contract before sending it" do
    let(:plan) { create(:billing_plan, school: school, base_amount_cents: 85_000) }
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: plan,
                        payer_guardian: mother, negotiated_amount_cents: 85_000)
    end
    let(:preview_path) { "/api/v1/schools/#{school.id}/billing/contracts/#{contract.id}/preview" }

    before { link(mother, "mother", primary: true) }

    it "renders the agreement with this contract's own data" do
      school.create_contract_template!(
        body_html: "<p>{{aluno.nome}}, CPF {{aluno.cpf}} — {{contrato.valor}} para " \
                   "{{contrato.responsavel}}.</p>"
      )

      get preview_path, headers: headers

      expect(response).to have_http_status(:ok)

      html = response.parsed_body.dig("data", "html")
      expect(html).to include("Pedro Silva")
      expect(html).to include("529.982.247-25")
      expect(html).to include("Maria Silva")
      expect(html).to include("R$ 850,00")
    end

    # Reading is not sending: a preview that dispatched would defeat its own purpose.
    it "sends nothing to the provider" do
      school.create_contract_template!(body_html: "<p>{{aluno.nome}}</p>")

      expect { get preview_path, headers: headers }
        .not_to change { contract.reload.provider_document_id }

      expect(contract.reload.sent_at).to be_nil
    end

    it "says so when the school has no agreement of its own" do
      get preview_path, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "is closed to guardians" do
      school.create_contract_template!(body_html: "<p>{{aluno.nome}}</p>")
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get preview_path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end
  end

  # A contract goes out with a wrong figure, or a family decides not to go ahead. Either way the
  # school has to stop it before it is signed.
  describe "cancelling a contract sent for signature" do
    let(:plan) { create(:billing_plan, school: school, base_amount_cents: 85_000) }
    let!(:signature_config) { create(:school_signature_provider, school: school) }
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: plan,
                        payer_guardian: mother, negotiated_amount_cents: 85_000,
                        signature_status: "pending_signature", provider_document_id: "doc-abc")
    end
    let(:cancel_path) do
      "/api/v1/schools/#{school.id}/billing/contracts/#{contract.id}/cancel_signature"
    end

    before do
      link(mother, "mother", primary: true)
      adapter = instance_double(Gateways::Signature::Fake, cancel_document: true)
      allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
    end

    it "records it as cancelled and answers with the contract" do
      post cancel_path, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "signature_status")).to eq("cancelled")
      expect(response.parsed_body.dig("data", "signature_cancelled_at")).to be_present
      expect(contract.reload.signature_status).to eq("cancelled")
    end

    it "leaves it out of the contracts still awaiting signature" do
      post cancel_path, headers: headers

      get "/api/v1/schools/#{school.id}/billing/contracts?signature_status=pending_signature",
          headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).not_to include(contract.id)
    end

    it "lists it under the cancelled ones" do
      post cancel_path, headers: headers

      get "/api/v1/schools/#{school.id}/billing/contracts?signature_status=cancelled",
          headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to include(contract.id)
    end

    it "refuses a contract the family already signed" do
      contract.update!(signature_status: "signed", signed_at: Time.current)

      post cancel_path, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(contract.reload.signature_status).to eq("signed")
    end

    it "is closed to guardians" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      post cancel_path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end

    it "does not reach another school's contract" do
      other = create(:school)
      other_contract = create(:contract, school: other, student: create(:student, school: other))

      post "/api/v1/schools/#{school.id}/billing/contracts/#{other_contract.id}/cancel_signature",
           headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  # Reading a contract and keeping a copy of it are the same errand: the school forwards it, files
  # it, or prints it for a family that asked. The bytes are the very document sent for signature,
  # not a second rendering that could drift from it.
  describe "downloading the contract as a PDF" do
    let(:plan) { create(:billing_plan, school: school, base_amount_cents: 85_000) }
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: plan,
                        payer_guardian: mother, negotiated_amount_cents: 85_000)
    end
    let(:document_path) { "/api/v1/schools/#{school.id}/billing/contracts/#{contract.id}/document" }

    before { link(mother, "mother", primary: true) }

    it "serves a PDF named after the contract" do
      get document_path, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/pdf")
      expect(response.body[0, 5]).to eq("%PDF-")
      expect(response.headers["Content-Disposition"]).to include("contrato-#{contract.id}")
    end

    it "sends nothing to the provider" do
      expect { get document_path, headers: headers }
        .not_to change { contract.reload.provider_document_id }
    end

    # Nobody is party to it yet, so there is no agreement to draw.
    it "refuses a contract whose student has no guardian on file" do
      orphan_student = create(:student, school: school, name: "Ana Souza")
      orphan = create(:contract, school: school, student: orphan_student, billing_plan: plan,
                                 negotiated_amount_cents: 85_000)

      get "/api/v1/schools/#{school.id}/billing/contracts/#{orphan.id}/document", headers: headers

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "is closed to guardians" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get document_path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end

    it "does not reach another school's contract" do
      other = create(:school)
      other_student = create(:student, school: other)
      other_contract = create(:contract, school: other, student: other_student)

      get "/api/v1/schools/#{school.id}/billing/contracts/#{other_contract.id}/document",
          headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
