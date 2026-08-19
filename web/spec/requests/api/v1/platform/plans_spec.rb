# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::Plans", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_platform_billing, user: operator) }

  before do
    %w[starter pro enterprise].each do |key|
      plan = PlatformPlan.find_or_create_by!(key: key) do |row|
        row.name = key.capitalize
        row.monthly_amount_cents = 29_900
      end
      ensure_platform_plan_prices(plan)
    end
  end

  path "/api/v1/platform/plans" do
    get "List platform plans" do
      tags "Backoffice", "Platform Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "plans listed" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          keys = rows.map { |row| row["key"] }
          expect(keys).to include("starter", "pro", "enterprise")
          starter = rows.find { |row| row["key"] == "starter" }
          expect(starter.fetch("intervals")).to be_present
          expect(starter.fetch("intervals").map { |row| row["billing_interval"] }).to include("month", "year")
        end
      end

      response "403", "missing permission" do
        let(:limited_user) { create(:user) }
        let!(:limited_membership) { create(:membership, :with_manage_multi_unit, user: limited_user) }
        let(:Authorization) { auth_headers_for(limited_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "school jwt is backoffice_only" do
        let(:school) { create(:school) }
        let(:director) { create(:user) }
        let!(:director_membership) { create_owner_membership(school, user: director) }
        let(:Authorization) { auth_headers_for(director)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end
end
