# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Contracts", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/billing/contracts" do
    parameter name: :school_id, in: :path, type: :integer

    post "Create contract" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          contract: {
            type: :object,
            properties: {
              student_id: { type: :integer },
              billing_plan_id: { type: :integer },
              negotiated_amount_cents: { type: :integer },
              due_day: { type: :integer }
            },
            required: %w[student_id billing_plan_id]
          }
        },
        required: %w[contract]
      }

      response "403", "guardian cannot manage contracts" do
        let(:payload) do
          {
            contract: {
              student_id: student.id,
              billing_plan_id: billing_plan.id,
              negotiated_amount_cents: 85_000,
              due_day: 10
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end
