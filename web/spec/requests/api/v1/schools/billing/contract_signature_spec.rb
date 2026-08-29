# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Contract signature lifecycle", type: :request do
  include ActiveJob::TestHelper
  # The school must be configured to sign its own contracts before any of them can be sent.
  let(:school) { create(:school, cnpj: "66.154.330/0001-40", signature_email: "colegio@example.com") }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }

  let(:headers) { auth_headers_for(staff_user) }
  let(:base_path) { "/api/v1/schools/#{school.id}/billing/contracts" }

  describe "POST /billing/contracts" do
    let(:attributes) do
      {
        student_id: student.id,
        billing_plan_id: billing_plan.id,
        negotiated_amount_cents: 85_000,
        due_day: 10
      }
    end

    def create_contract(contract: attributes)
      post base_path, params: { contract: contract }, headers: headers, as: :json
    end

    context "with the school's signature provider configured" do
      let!(:config) { create(:school_signature_provider, school: school) }

      # Creating and sending are one step: a contract exists once the family has it.
      it "records the contract and dispatches it to the family" do
        create_contract

        expect(response).to have_http_status(:created)

        body = response.parsed_body
        expect(body.dig("data", "signature_status")).to eq("pending_signature")
        expect(body.dig("data", "sent_at")).to be_present
        expect(body.dig("data", "sent_to_provider")).to be(true)
        expect(body.dig("data", "signed_at")).to be_nil
        # Saves the list a lookup per row just to name the child.
        expect(body.dig("data", "student_name")).to eq(student.name)
      end

      # A contract the family has not returned must not be presented as agreed, whatever the
      # caller sends.
      it "ignores a signature status supplied by the client" do
        create_contract(contract: attributes.merge(signature_status: "signed"))

        expect(response).to have_http_status(:created)
        expect(response.parsed_body.dig("data", "signature_status")).to eq("pending_signature")
      end
    end

    # Nothing reached the family, so nothing goes on the books — otherwise every failed attempt
    # would sit in the listing as an agreement nobody received.
    it "keeps no contract when the send fails" do
      expect { create_contract }.not_to change(Contract, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details", "base").first)
        .to include("assinatura")
    end
  end

  # Reading what is about to be sent, from a form that was never saved.
  describe "POST /billing/contracts/preview_draft" do
    let!(:template) do
      ContractTemplate.create!(school: school, body_html: "<h1>Contrato de {{ aluno.nome }}</h1>")
    end

    it "renders the agreement without recording anything" do
      expect do
        post "#{base_path}/preview_draft",
             params: {
               contract: {
                 student_id: student.id,
                 billing_plan_id: billing_plan.id,
                 negotiated_amount_cents: 85_000,
                 due_day: 10
               }
             },
             headers: headers,
             as: :json
      end.not_to change(Contract, :count)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "html")).to include(student.name)
      expect(response.parsed_body.dig("data", "filename")).to include(student.name.parameterize)
    end

    it "reports what the form is missing instead of rendering" do
      post "#{base_path}/preview_draft",
           params: { contract: { student_id: student.id, negotiated_amount_cents: -1 } },
           headers: headers,
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to include("billing_plan")
    end
  end

  describe "POST /billing/contracts/:id/sign" do
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: billing_plan,
                        signature_status: "pending_signature")
    end

    it "marks the contract signed and records when" do
      expect do
        post "#{base_path}/#{contract.id}/sign", headers: headers, as: :json
      end.to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)
        .with(contract.id, school.id)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("data", "signature_status")).to eq("signed")
      expect(response.parsed_body.dig("data", "signed_at")).to be_present
    end

    it "keeps the original signature date when signed twice" do
      post "#{base_path}/#{contract.id}/sign", headers: headers, as: :json
      first_signed_at = contract.reload.signed_at

      expect do
        post "#{base_path}/#{contract.id}/sign", headers: headers, as: :json
      end.not_to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)

      expect(response).to have_http_status(:ok)
      expect(contract.reload.signed_at).to eq(first_signed_at)
    end

    it "refuses a contract from another school" do
      other = create(:contract, school: create(:school))

      post "#{base_path}/#{other.id}/sign", headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /billing/contracts" do
    let!(:signed_contract) do
      create(:contract, school: school, student: student, billing_plan: billing_plan,
                        signature_status: "signed", signed_at: Time.current)
    end
    let!(:pending_contract) do
      create(:contract, school: school, student: student, billing_plan: billing_plan,
                        signature_status: "pending_signature")
    end
    let!(:other_family_contract) do
      create(:contract, school: school, billing_plan: billing_plan,
                        student: create(:student, school: school))
    end

    it "narrows to the contracts of one guardian's children" do
      get base_path, params: { guardian_id: guardian.id }, headers: headers

      ids = response.parsed_body["data"].map { |row| row["id"] }
      expect(ids).to match_array([ signed_contract.id, pending_contract.id ])
      expect(ids).not_to include(other_family_contract.id)
    end

    it "filters by signature status" do
      get base_path,
          params: { guardian_id: guardian.id, signature_status: "signed" },
          headers: headers

      expect(response.parsed_body["data"].map { |row| row["id"] }).to eq([ signed_contract.id ])
    end

    it "returns nothing for a signature status that does not exist" do
      get base_path, params: { signature_status: "notarised" }, headers: headers

      expect(response.parsed_body["data"]).to be_empty
    end
  end

  describe "GET /people/students" do
    let!(:unrelated_student) { create(:student, school: school) }

    it "narrows to the children linked to one guardian" do
      get "/api/v1/schools/#{school.id}/people/students",
          params: { guardian_id: guardian.id },
          headers: headers

      ids = response.parsed_body["data"].map { |row| row["id"] }
      expect(ids).to eq([ student.id ])
      expect(ids).not_to include(unrelated_student.id)
    end

    it "drops a child whose link to the guardian was discarded" do
      link.discard!

      get "/api/v1/schools/#{school.id}/people/students",
          params: { guardian_id: guardian.id },
          headers: headers

      expect(response.parsed_body["data"]).to be_empty
    end
  end
end
