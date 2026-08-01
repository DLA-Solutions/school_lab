# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Summary", type: :request do
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

  path "/api/v1/schools/{school_id}/billing/summary" do
    parameter name: :school_id, in: :path, type: :integer

    get "Billing summary" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "summary reflects open and overdue counts" do
        before do
          3.times do
            create(:charge, school: school, contract: contract, guardian: guardian,
                            total_amount_cents: 10_000)
          end
          2.times do
            create(:charge, :overdue, school: school, contract: contract, guardian: guardian,
                                      total_amount_cents: 20_000)
          end
          5.times do |i|
            charge = create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                                            total_amount_cents: 5_000)
            create(:payment, school: school, charge: charge, paid_amount_cents: 5_000,
                             paid_at: Time.current, provider_payment_id: "paid-#{i}")
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["open_count"]).to eq(3)
          expect(body["overdue_count"]).to eq(2)
          expect(body["paid_this_month_count"]).to eq(5)
          expect(body["open_amount_cents"]).to eq(30_000)
          expect(body["overdue_amount_cents"]).to eq(40_000)
        end
      end
    end
  end
end
