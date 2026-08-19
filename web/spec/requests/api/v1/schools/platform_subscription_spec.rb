# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::PlatformSubscriptions", type: :request do
  let(:school) { create(:school, cnpj: "12.345.678/0001-90") }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:director) { create(:user) }
  let!(:director_membership) { create_owner_membership(school, user: director).last }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { create(:membership, :staff, user: teacher_user, school: school) }
  let(:plan) { PlatformPlan.find_by(key: "pro") || create(:platform_plan, :pro) }
  let(:Authorization) { auth_headers_for(director)["Authorization"] }

  before do
    PlatformBillingSetting.instance.update!(active_provider: "fake")
    ensure_platform_plan_prices(plan)
  end

  path "/api/v1/schools/{school_id}/platform_subscription" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show school platform subscription" do
      tags "Platform Subscriptions"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "null when none assigned" do
        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data")).to be_nil
        end
      end

      response "404", "cross-school" do
        let(:school_id) { other_school.id }

        run_test!
      end

      response "403", "guardian forbidden" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test!
      end

      response "403", "teacher forbidden" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/platform_subscription/checkout" do
    parameter name: :school_id, in: :path, type: :integer

    post "Checkout school platform subscription" do
      tags "Platform Subscriptions"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :body, in: :body, schema: {
        type: :object,
        properties: {
          plan_key: { type: :string },
          billing_interval: { type: :string },
          trial: { type: :boolean }
        }
      }

      response "201", "checkout url returned" do
        let(:body) { { plan_key: "pro", billing_interval: "month", trial: false } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("checkout_url")).to be_present
          expect(data.fetch("billing_portal_url")).to be_nil
        end
      end

      response "501", "manual provider cannot collect" do
        let(:body) { { plan_key: "pro", billing_interval: "month" } }

        before { PlatformBillingSetting.instance.update!(active_provider: "manual") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_implemented")
        end
      end

      response "409", "manual row blocks director checkout" do
        let(:body) { { plan_key: "pro", billing_interval: "month" } }

        before do
          PlatformBillingSetting.instance.update!(active_provider: "fake")
          create(:platform_subscription, school: school, platform_plan: plan, provider: "manual")
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/platform_subscription/invoices" do
    parameter name: :school_id, in: :path, type: :integer

    get "List school platform invoices" do
      tags "Platform Invoices"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "invoices listed without vendor ids" do
        let!(:subscription) { create(:platform_subscription, school: school, platform_plan: plan, provider: "iugu") }
        let!(:invoice) { create(:platform_invoice, platform_subscription: subscription, school: school) }

        run_test! do |response|
          row = JSON.parse(response.body).fetch("data").first
          expect(row).not_to have_key("external_invoice_id")
          expect(row.fetch("hosted_invoice_url")).to be_present
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/platform_subscription/change_plan" do
    parameter name: :school_id, in: :path, type: :integer

    post "Change school platform subscription plan" do
      tags "Platform Subscriptions"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :body, in: :body, schema: {
        type: :object,
        properties: {
          plan_key: { type: :string },
          billing_interval: { type: :string }
        }
      }

      response "200", "plan changed" do
        let!(:subscription) do
          create(:platform_subscription, school: school, platform_plan: plan, provider: "manual", status: "active")
        end
        let(:starter) do
          PlatformPlan.find_or_create_by!(key: "starter") do |row|
            row.name = "Starter"
            row.monthly_amount_cents = 29_900
          end
        end
        let(:body) { { plan_key: "starter", billing_interval: "year" } }

        before { starter }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("plan_key")).to eq("starter")
          expect(data.fetch("billing_interval")).to eq("year")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/platform_subscription/cancel" do
    parameter name: :school_id, in: :path, type: :integer

    post "Cancel school platform subscription" do
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
        let!(:subscription) do
          create(:platform_subscription, school: school, platform_plan: plan, provider: "manual", status: "active")
        end
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
