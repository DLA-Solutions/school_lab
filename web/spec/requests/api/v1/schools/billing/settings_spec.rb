# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Settings", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  path "/api/v1/schools/{school_id}/billing/settings" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show billing settings" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns defaults when no row exists" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["overdue_grace_days"]).to eq(3)
          expect(body["service_description"]).to eq(I18n.t("billing.settings.default_service_description"))
          expect(body["persisted"]).to be(false)
        end
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end

    patch "Update billing settings" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          billing_settings: {
            type: :object,
            properties: {
              overdue_grace_days: { type: :integer },
              service_description: { type: :string },
              interest_rate_percent: { type: :number, format: :float },
              notification_schedule: { type: :object }
            }
          }
        },
        required: %w[billing_settings]
      }

      response "200", "school staff updates settings" do
        let(:payload) do
          {
            billing_settings: {
              overdue_grace_days: 5,
              service_description: "Mensalidade atualizada",
              interest_rate_percent: 1.0
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["overdue_grace_days"]).to eq(5)
          expect(body["service_description"]).to eq("Mensalidade atualizada")
          expect(body["interest_rate_percent"]).to eq(1.0)
          expect(body["persisted"]).to be(true)
        end
      end

      response "422", "validation error for invalid interest rate" do
        let(:payload) do
          { billing_settings: { interest_rate_percent: 0 } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end

      response "403", "forbidden for guardian update" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:payload) { { billing_settings: { overdue_grace_days: 1 } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "not found for another school" do
        let(:school_id) { other_school.id }
        let(:payload) { { billing_settings: { overdue_grace_days: 1 } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "422", "validation error for long service description" do
        let(:payload) do
          { billing_settings: { service_description: "a" * 101 } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end

      response "422", "validation error for percent fine without rate" do
        let(:payload) do
          { billing_settings: { fine_type: "percent" } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end

      response "422", "validation error for fixed fine without amount" do
        let(:payload) do
          { billing_settings: { fine_type: "fixed" } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end

      response "422", "validation error for invalid early payment discount" do
        let(:payload) do
          { billing_settings: { early_payment_discount_percent: 0 } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end

      response "200", "persists early payment discount and percent fine" do
        let(:payload) do
          {
            billing_settings: {
              early_payment_discount_percent: 5.0,
              fine_type: "percent",
              fine_rate_percent: 2.0
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["early_payment_discount_percent"]).to eq(5.0)
          expect(body["fine_type"]).to eq("percent")
          expect(body["fine_rate_percent"]).to eq(2.0)
          expect(body["fine_amount_cents"]).to be_nil
        end
      end

      response "200", "persists fixed fine and clears percent rate" do
        let(:payload) do
          {
            billing_settings: {
              fine_type: "fixed",
              fine_amount_cents: 1500
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["fine_type"]).to eq("fixed")
          expect(body["fine_amount_cents"]).to eq(1500)
          expect(body["fine_rate_percent"]).to be_nil
        end
      end
    end
  end
end
