# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Payments", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:student) { create(:student, school: school) }
  let!(:student_guardian_link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:other_guardian) { create(:guardian, school: school) }
  let(:other_student) { create(:student, school: school) }
  let(:other_contract) do
    create(:contract, school: school, student: other_student, billing_plan: billing_plan)
  end
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/me/payments" do
    parameter name: :school_id, in: :path, type: :integer

    get "List payment history" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "family-scoped payments" do
        let!(:charge) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:payment_p) { create(:payment, school: school, charge: charge) }
        let!(:other_charge) do
          create(:charge, :paid, :issued, school: school, contract: other_contract, guardian: other_guardian)
        end
        let!(:payment_p2) { create(:payment, school: school, charge: other_charge) }

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(payment_p.id)
          expect(ids).not_to include(payment_p2.id)
        end
      end
    end
  end
end
