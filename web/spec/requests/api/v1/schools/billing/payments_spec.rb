# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Payments", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan)
  end

  path "/api/v1/schools/{school_id}/billing/payments" do
    parameter name: :school_id, in: :path, type: :integer

    get "List payments" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "payments expose provider payment identifier" do
        let!(:payment) do
          charge = create(:charge, :issued, :paid, school: school, contract: contract, guardian: guardian)
          create(:payment, school: school, charge: charge, provider_payment_id: "pay-provider-123")
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          record = body.find { |item| item["id"] == payment.id }

          expect(record["provider_payment_id"]).to eq("pay-provider-123")
          expect(record).not_to have_key("psp_transaction_id")
        end
      end
    end
  end
end
