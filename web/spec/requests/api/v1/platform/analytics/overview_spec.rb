# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::Analytics::Overview", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_view_analytics_dashboard, user: operator) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school, onboarding_status: "active") }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }
  let!(:starter_plan) { PlatformPlan.find_or_create_by!(key: "starter") { |plan| plan.assign_attributes(name: "Starter", monthly_amount_cents: 29_900) } }

  before do
    Schools::SeedSchoolModulesService.call(school: school)
    create(:platform_subscription, school: school, platform_plan: starter_plan, status: "active")
    create(:school, onboarding_status: "provisioning")
  end

  path "/api/v1/platform/analytics/overview" do
    get "Platform analytics overview" do
      tags "Backoffice", "Platform Analytics"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :date_from, in: :query, type: :string, required: false
      parameter name: :date_to, in: :query, type: :string, required: false

      response "200", "aggregate overview returned" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("active_schools")).to be >= 1
          expect(data.fetch("provisioning_count")).to be >= 1
          expect(data.fetch("module_adoption")).to include("communication")
          expect(data.fetch("mrr_cents")).to eq(29_900)
          expect(data.fetch("onboarding_funnel")).to include("active", "provisioning")
        end
      end

      response "200", "interim manage_backoffice_ops access" do
        let(:ops_user) { create(:user) }
        let!(:ops_membership) { create(:membership, :with_manage_backoffice_ops, user: ops_user) }
        let(:Authorization) { auth_headers_for(ops_user)["Authorization"] }

        run_test!
      end

      response "422", "invalid date_from" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:date_from) { "not-a-date" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end

      response "403", "staff forbidden" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end
end
