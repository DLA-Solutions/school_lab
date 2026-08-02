# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::ChargeGenerations", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school, base_amount_cents: 90_000) }
  let!(:student_guardian) do
    create(:student_guardian, school: school, student: student, guardian: guardian, primary_guardian: true)
  end
  let!(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan,
                      negotiated_amount_cents: 90_000, due_day: 10, status: "active")
  end

  path "/api/v1/schools/{school_id}/billing/charge_generations" do
    parameter name: :school_id, in: :path, type: :integer

    post "Generate charges for billing period" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          billing_period: { type: :string, example: "2026-08" }
        },
        required: %w[billing_period]
      }

      response "201", "charges generated for active contracts" do
        let(:payload) { { billing_period: "2026-08" } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["created_charges"]).to eq(1)
          expect(body["skipped_contract_ids"]).to eq([])
          expect(Charge.kept.where(school: school, billing_period: Date.new(2026, 8, 1)).count).to eq(1)
        end
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:payload) { { billing_period: "2026-08" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "forbidden for teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) { { billing_period: "2026-08" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "not found for another school" do
        let(:school_id) { other_school.id }
        let(:payload) { { billing_period: "2026-08" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "201", "idempotent re-run skips existing contracts" do
        let(:payload) { { billing_period: "2026-08" } }

        before do
          create(:charge, school: school, contract: contract, guardian: guardian,
                          billing_period: Date.new(2026, 8, 1))
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["created_charges"]).to eq(0)
          expect(body["skipped_contract_ids"]).to eq([ contract.id ])
          expect(Charge.kept.where(contract: contract, billing_period: Date.new(2026, 8, 1)).count).to eq(1)
        end
      end
    end
  end
end
