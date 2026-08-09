# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Manual activation, contract payer and one-off charges", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  let(:school_class) { create(:school_class, school: school) }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva") }
  let(:father) { create(:guardian, school: school, name: "João Silva") }
  let(:student) { create(:student, school: school, school_class: school_class) }

  def link(guardian, relationship)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship)
  end

  describe "activating by hand" do
    let(:guardians_path) { "/api/v1/schools/#{school.id}/people/guardians" }
    let(:students_path) { "/api/v1/schools/#{school.id}/people/students" }

    it "brings a guardian back" do
      link(mother, "mother")
      People::DiscardStudentService.call(student: student, actor: staff_user)
      expect(mother.reload).to be_discarded

      post "#{guardians_path}/#{mother.id}/activate", headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(mother.reload).not_to be_discarded
      expect(response.parsed_body.dig("data", "active")).to be(true)
    end

    it "refuses to activate one that is already active" do
      post "#{guardians_path}/#{mother.id}/activate", headers: headers, as: :json

      expect(response).to have_http_status(:conflict)
    end

    # Putting a child back on the roll brings their guardians with them.
    it "brings the guardians back when the student is activated" do
      link(mother, "mother")
      link(father, "father")
      People::DiscardStudentService.call(student: student, actor: staff_user)

      post "#{students_path}/#{student.id}/activate", headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(mother.reload).not_to be_discarded
      expect(father.reload).not_to be_discarded
    end

    it "does not reach another school's record" do
      outsider = create(:guardian, school: create(:school))
      outsider.discard

      post "#{guardians_path}/#{outsider.id}/activate", headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
    end

    describe "the situation filter" do
      before do
        link(mother, "mother")
        People::DiscardStudentService.call(student: student, actor: staff_user)
      end

      it "lists only the active ones by default" do
        get guardians_path, headers: headers

        expect(response.parsed_body["data"].map { |row| row["id"] }).not_to include(mother.id)
      end

      # Without this there is no way to reach a record in order to reactivate it.
      it "lists the inactive ones when asked" do
        get guardians_path, params: { status: "inactive" }, headers: headers

        rows = response.parsed_body["data"]
        expect(rows.map { |row| row["id"] }).to include(mother.id)
        expect(rows.find { |row| row["id"] == mother.id }["active"]).to be(false)
      end

      it "lists both when asked for all" do
        other = create(:guardian, school: school)

        get guardians_path, params: { status: "all" }, headers: headers

        ids = response.parsed_body["data"].map { |row| row["id"] }
        expect(ids).to include(mother.id, other.id)
      end

      it "still filters inactive students by school" do
        create(:student, school: create(:school)).discard

        get students_path, params: { status: "inactive" }, headers: headers

        expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([student.id])
      end
    end
  end

  describe "the contract's payer" do
    let(:contracts_path) { "/api/v1/schools/#{school.id}/billing/contracts" }
    let(:plan) { create(:billing_plan, school: school) }

    before do
      link(mother, "mother")
      link(father, "father")
    end

    it "records which guardian receives the boletos" do
      post contracts_path,
           params: {
             contract: { student_id: student.id, billing_plan_id: plan.id,
                         payer_guardian_id: father.id, negotiated_amount_cents: 85_000 }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "payer_guardian_id")).to eq(father.id)
      expect(response.parsed_body.dig("data", "payer_name")).to eq("João Silva")
    end

    # A boleto in a stranger's name is a mistake, not a billing choice.
    it "refuses a payer who is not a guardian of that student" do
      outsider = create(:guardian, school: school)

      post contracts_path,
           params: {
             contract: { student_id: student.id, billing_plan_id: plan.id,
                         payer_guardian_id: outsider.id }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("payer_guardian")
    end

    it "falls back to the first guardian when none was chosen" do
      post contracts_path,
           params: { contract: { student_id: student.id, billing_plan_id: plan.id } },
           headers: headers, as: :json

      expect(response.parsed_body.dig("data", "payer_name")).to eq("Maria Silva")
    end

    # The family has to read, in the agreement itself, who will be billed.
    it "names the payer in the rendered agreement" do
      contract = create(:contract, school: school, student: student, billing_plan: plan,
                                   payer_guardian: father)
      school.create_contract_template!(
        body_html: "<p>Boletos para {{contrato.responsavel}}, CPF {{contrato.responsavel.cpf}}.</p>"
      )

      result = Contracts::FillTemplateService.call(contract: contract)

      expect(result.data.fetch(:html)).to include("João Silva")
      expect(result.data.fetch(:html)).to include(Cpf.format(father.cpf))
    end
  end

  describe "one-off charges" do
    let(:charges_path) { "/api/v1/schools/#{school.id}/billing/charges" }
    let(:plan) { create(:billing_plan, school: school) }
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: plan,
                        payer_guardian: mother)
    end

    before { link(mother, "mother") }

    it "raises one against the contract's payer" do
      post charges_path,
           params: {
             charge: { contract_id: contract.id, total_amount_cents: 12_500,
                       due_date: "2026-09-10", description: "Excursão pedagógica" }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)

      body = response.parsed_body["data"]
      expect(body["kind"]).to eq("one_off")
      expect(body["description"]).to eq("Excursão pedagógica")
      expect(body["total_amount_cents"]).to eq(12_500)
      # The boleto is registered against this CPF.
      expect(body.dig("guardian", "id")).to eq(mother.id)
      expect(body.dig("guardian", "cpf")).to eq(mother.cpf)
    end

    # The monthly slot is one per contract per period; a one-off must not consume it, nor be
    # blocked by it.
    it "coexists with the tuition of the same month" do
      create(:charge, school: school, contract: contract, guardian: mother,
                      billing_period: Date.new(2026, 9, 1), kind: "tuition")

      post charges_path,
           params: {
             charge: { contract_id: contract.id, total_amount_cents: 5_000,
                       due_date: "2026-09-20", description: "Segunda via de uniforme" }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
    end

    it "allows more than one in the same month" do
      2.times do |index|
        post charges_path,
             params: {
               charge: { contract_id: contract.id, total_amount_cents: 1_000 * (index + 1),
                         due_date: "2026-09-10" }
             },
             headers: headers, as: :json

        expect(response).to have_http_status(:created)
      end
    end

    it "rejects an amount of zero" do
      post charges_path,
           params: { charge: { contract_id: contract.id, total_amount_cents: 0, due_date: "2026-09-10" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "rejects a missing due date" do
      post charges_path,
           params: { charge: { contract_id: contract.id, total_amount_cents: 1_000 } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "refuses a contract from another school" do
      outsider = create(:contract, school: create(:school))

      post charges_path,
           params: { charge: { contract_id: outsider.id, total_amount_cents: 1_000, due_date: "2026-09-10" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it "denies a guardian" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      post charges_path,
           params: { charge: { contract_id: contract.id, total_amount_cents: 1_000, due_date: "2026-09-10" } },
           headers: auth_headers_for(guardian_user), as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end
end
