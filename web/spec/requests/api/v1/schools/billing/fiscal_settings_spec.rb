# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::FiscalSettings", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }
  let(:adapter) { instance_double(Gateways::ServiceInvoice::Fake) }

  before do
    allow(Billing::SearchSupportedCitiesService).to receive(:new).and_return(
      instance_double(Billing::SearchSupportedCitiesService, call: nil)
    )
    allow_any_instance_of(Billing::UpdateFiscalSettingsService).to receive(:adapter).and_return(adapter)
    allow(adapter).to receive(:list_supported_cities).and_return(
      [
        Gateways::ServiceInvoice::ValueObjects::SupportedCity.new(
          code: 5_208_707, name: "Goiânia", state: "GO", provider: "ISSNet", provider_options: {}
        )
      ]
    )
  end

  path "/api/v1/schools/{school_id}/billing/fiscal_settings" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show fiscal settings" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns fiscal settings" do
        before { create(:school_fiscal_setting, school: school) }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["spedy_city_code"]).to eq(5_208_707)
        end
      end
    end

    patch "Update fiscal settings" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          fiscal_settings: {
            type: :object,
            properties: {
              enabled: { type: :boolean },
              spedy_city_code: { type: :integer },
              federal_service_code: { type: :string },
              iss_rate_percent: { type: :number }
            }
          }
        },
        required: %w[fiscal_settings]
      }

      response "200", "updates fiscal settings" do
        let(:payload) do
          {
            fiscal_settings: {
              enabled: false,
              issuance_city_name: "Goiânia",
              issuance_state: "GO",
              spedy_city_code: 5_208_707,
              federal_service_code: "8.01",
              iss_rate_percent: 5.0,
              service_description: "Mensalidade escolar"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["federal_service_code"]).to eq("8.01")
        end
      end

      response "422", "rejects invalid Spedy city when enabling" do
        let(:payload) do
          {
            fiscal_settings: {
              enabled: true,
              issuance_city_name: "Invalid",
              issuance_state: "GO",
              spedy_city_code: 999_999,
              federal_service_code: "8.01",
              iss_rate_percent: 5.0,
              service_description: "Mensalidade escolar"
            }
          }
        end

        before do
          allow(adapter).to receive(:list_supported_cities).and_return([])
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end
end
