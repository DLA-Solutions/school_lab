# frozen_string_literal: true

require "swagger_helper"

OPERATIONAL_SUMMARY_RESPONSE_SCHEMA = {
  type: :object,
  required: %w[data],
  properties: {
    data: {
      type: :object,
      required: %w[credentials_expiring schools_with_disabled_modules provisioning_backlog_count],
      properties: {
        credentials_expiring: {
          type: :array,
          items: {
            type: :object,
            required: %w[school_id school_name certificate_expires_at days_remaining],
            properties: {
              school_id: { type: :integer },
              school_name: { type: :string },
              certificate_expires_at: { type: :string, format: "date-time" },
              days_remaining: { type: :integer }
            }
          }
        },
        schools_with_disabled_modules: {
          type: :array,
          items: {
            type: :object,
            required: %w[school_id school_name disabled_modules],
            properties: {
              school_id: { type: :integer },
              school_name: { type: :string },
              disabled_modules: {
                type: :array,
                items: { type: :string }
              }
            }
          }
        },
        provisioning_backlog_count: { type: :integer }
      }
    }
  }
}.freeze

RSpec.describe "Api::V1::Platform::OperationalSummary", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_manage_backoffice_ops, user: backoffice_user) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  path "/api/v1/platform/operational_summary" do
    get "Platform operational summary" do
      tags "Backoffice", "Platform"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "backoffice reads operational alerts" do
        schema OPERATIONAL_SUMMARY_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let!(:expiring_school) { create(:school, name: "Expiring Cert School") }
        let!(:disabled_modules_school) { create(:school, name: "Billing Off School") }
        let!(:provisioning_school) { create(:school, :provisioning, name: "Stuck Provisioning") }

        before do
          config = create(:school_payment_provider, :cora, school: expiring_school)
          config.update_columns(certificate_expires_at: 10.days.from_now)
          Schools::SeedSchoolModulesService.call(
            school: disabled_modules_school,
            overrides: { billing: false }
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expiring = body.fetch("credentials_expiring")
          expect(expiring.pluck("school_id")).to include(expiring_school.id)
          expect(expiring.first).not_to have_key("client_id")

          disabled = body.fetch("schools_with_disabled_modules")
          expect(disabled.pluck("school_id")).to include(disabled_modules_school.id)
          expect(disabled.find { |row| row["school_id"] == disabled_modules_school.id }
            .fetch("disabled_modules")).to include("billing")

          expect(body.fetch("provisioning_backlog_count")).to be >= 1
        end
      end

      response "403", "staff without backoffice role" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end
end
