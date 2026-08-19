# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::Subscriptions", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_platform_billing, user: operator) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }
  let!(:starter_plan) { PlatformPlan.find_or_create_by!(key: "starter") { |plan| plan.assign_attributes(name: "Starter", monthly_amount_cents: 29_900) } }
  let!(:pro_plan) { PlatformPlan.find_or_create_by!(key: "pro") { |plan| plan.assign_attributes(name: "Pro", monthly_amount_cents: 59_900) } }

  path "/api/v1/platform/subscriptions" do
    get "List platform subscriptions" do
      tags "Backoffice", "Platform Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "subscriptions listed" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:subscription) { create(:platform_subscription, school: school, platform_plan: starter_plan) }

        run_test! do |response|
          ids = JSON.parse(response.body).fetch("data").map { |row| row["id"] }
          expect(ids).to include(subscription.id)
        end
      end

      response "403", "staff forbidden" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end

    post "Create platform subscription" do
      tags "Backoffice", "Platform Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :subscription, in: :body, schema: {
        type: :object,
        properties: {
          subscription: {
            type: :object,
            properties: {
              school_id: { type: :integer },
              platform_plan_id: { type: :integer },
              status: { type: :string }
            },
            required: %w[school_id platform_plan_id]
          }
        }
      }

      response "201", "subscription created" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:subscription) do
          { subscription: { school_id: school.id, platform_plan_id: starter_plan.id, status: "active" } }
        end

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("school_id")).to eq(school.id)
          expect(data.fetch("platform_plan_id")).to eq(starter_plan.id)
          expect(data.fetch("provider")).to eq("manual")
        end
      end

      response "409", "subscription already exists" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:subscription) do
          { subscription: { school_id: school.id, platform_plan_id: starter_plan.id } }
        end

        before { create(:platform_subscription, school: school, platform_plan: starter_plan) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("subscription_exists")
        end
      end

      response "404", "unknown school" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:subscription) do
          { subscription: { school_id: 0, platform_plan_id: starter_plan.id } }
        end

        run_test!
      end
    end
  end

  path "/api/v1/platform/subscriptions/{id}" do
    parameter name: :id, in: :path, type: :integer

    get "Show platform subscription" do
      tags "Backoffice", "Platform Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "subscription found" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) { create(:platform_subscription, school: school, platform_plan: starter_plan) }
        let(:id) { record.id }

        run_test!
      end

      response "404", "unknown subscription" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:id) { 0 }

        run_test!
      end
    end

    patch "Update platform subscription" do
      tags "Backoffice", "Platform Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :subscription, in: :body, schema: {
        type: :object,
        properties: {
          subscription: {
            type: :object,
            properties: {
              platform_plan_id: { type: :integer },
              status: { type: :string }
            }
          }
        }
      }

      response "200", "plan change audited" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) { create(:platform_subscription, school: school, platform_plan: starter_plan) }
        let(:id) { record.id }
        let(:subscription) { { subscription: { platform_plan_id: pro_plan.id, status: "trialing" } } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("platform_plan_id")).to eq(pro_plan.id)
          expect(data.fetch("status")).to eq("trialing")
        end
      end

      response "403", "backoffice without billing permission" do
        let(:limited_user) { create(:user) }
        let!(:limited_membership) { create(:membership, :with_manage_backoffice_ops, user: limited_user) }
        let(:Authorization) { auth_headers_for(limited_user)["Authorization"] }
        let!(:record) { create(:platform_subscription, school: school, platform_plan: starter_plan) }
        let(:id) { record.id }
        let(:subscription) { { subscription: { status: "past_due" } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/platform/subscriptions/{id}/checkout" do
    parameter name: :id, in: :path, type: :integer

    post "Create hosted checkout for a subscription" do
      tags "Platform Subscriptions"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "checkout url" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) do
          ensure_platform_plan_prices(starter_plan)
          create(:platform_subscription, school: school, platform_plan: starter_plan, provider: "fake",
                                         collection_method: "send_invoice")
        end
        let(:id) { record.id }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("checkout_url")).to be_present
          expect(data.fetch("billing_portal_url")).to be_nil
        end
      end
    end
  end

  path "/api/v1/platform/subscriptions/{id}/invoices" do
    parameter name: :id, in: :path, type: :integer

    get "List platform invoices" do
      tags "Platform Invoices"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "invoices listed with external ids for operators" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) { create(:platform_subscription, school: school, platform_plan: starter_plan) }
        let!(:invoice) { create(:platform_invoice, platform_subscription: record, school: school) }
        let(:id) { record.id }

        run_test! do |response|
          row = JSON.parse(response.body).fetch("data").first
          expect(row.fetch("external_invoice_id")).to be_present
        end
      end

      response "403", "staff forbidden" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
        let!(:record) { create(:platform_subscription, school: school, platform_plan: starter_plan) }
        let(:id) { record.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end

  path "/api/v1/platform/subscriptions/{id}/change_plan" do
    parameter name: :id, in: :path, type: :integer

    post "Change platform subscription plan" do
      tags "Platform Subscriptions"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :body, in: :body, schema: {
        type: :object,
        properties: {
          platform_plan_id: { type: :integer },
          billing_interval: { type: :string }
        }
      }

      response "200", "plan changed" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) do
          create(:platform_subscription, school: school, platform_plan: starter_plan, provider: "manual",
                                         status: "active")
        end
        let(:id) { record.id }
        let(:body) { { platform_plan_id: pro_plan.id, billing_interval: "year" } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("platform_plan_id")).to eq(pro_plan.id)
          expect(data.fetch("billing_interval")).to eq("year")
        end
      end
    end
  end

  path "/api/v1/platform/subscriptions/{id}/cancel" do
    parameter name: :id, in: :path, type: :integer

    post "Cancel platform subscription" do
      tags "Platform Subscriptions"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :body, in: :body, schema: {
        type: :object,
        properties: {
          at_period_end: { type: :boolean }
        }
      }

      response "200", "canceled at period end" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:record) do
          create(:platform_subscription, school: school, platform_plan: starter_plan, provider: "manual",
                                         status: "active")
        end
        let(:id) { record.id }
        let(:body) { { at_period_end: true } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("cancel_at_period_end")).to eq(true)
          expect(data.fetch("status")).to eq("active")
        end
      end
    end
  end
end
