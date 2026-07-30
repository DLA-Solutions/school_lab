# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Charges", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan)
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}/cancel" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Cancel charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "pending charge cancelled" do
        let!(:charge) { create(:charge, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do
          expect(charge.reload.status).to eq("cancelled")
        end
      end

      response "409", "second cancel returns invalid_state_transition" do
        let!(:charge) { create(:charge, :cancelled, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_state_transition")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    delete "Discard charge" do
      tags "Billing"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "soft-discards erroneous charge" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge.id }

        run_test! do
          charge.reload
          expect(charge.discarded_at).to be_present
          expect(charge.status).to eq("pending")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}/reissue" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Reissue charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "409", "reissue paid charge returns conflict" do
        let!(:charge) { create(:charge, :paid, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_state_transition")
        end
      end
    end
  end
end
