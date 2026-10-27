# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::FiscalCredentials", type: :request do
  let(:base_url) { "https://spedy.test/v1" }
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }
  let(:api_key) { "customer-company-key" }

  before do
    allow(SchoolLab::Integrations::Spedy::Configuration).to receive(:current).and_return(api_base_url: base_url)
  end

  path "/api/v1/schools/{school_id}/billing/fiscal_credentials" do
    parameter name: :school_id, in: :path, type: :integer

    post "Register an existing Spedy api_key, or provision a new Spedy company when api_key is omitted" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, required: false, schema: {
        type: :object,
        properties: {
          api_key: { type: :string, description: "Existing Spedy company API key (never returned)" },
          company_id: { type: :string, description: "Optional Spedy company id; discovered when omitted" },
          base_url: {
            type: :string,
            description: "Optional https Spedy API base URL for this school (including /v1); blank = default"
          }
        }
      }

      let(:payload) { { api_key: api_key } }

      def stub_companies(status: 200, body: { items: [ { id: "company-1" } ] }.to_json)
        stub_request(:get, "#{base_url}/companies")
          .with(headers: { "X-Api-Key" => api_key })
          .to_return(status: status, body: body)
      end

      response "201", "registers the key and discovers the company id" do
        before { stub_companies }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body).to include("provider" => "spedy", "instrument" => "service_invoice", "active" => true)
          expect(response.body).not_to include(api_key)

          record = school.school_payment_providers.find(body.fetch("id"))
          expect(record.api_key).to eq(api_key)
          expect(record.spedy_company_id).to eq("company-1")
          expect(record.uploaded_by_id).to eq(school_admin.id)
        end
      end

      response "201", "registers the key against a per-school base_url and exposes it" do
        let(:payload) { { api_key: api_key, base_url: "https://sandbox.spedy.test/v1" } }

        before do
          stub_request(:get, "https://sandbox.spedy.test/v1/companies")
            .with(headers: { "X-Api-Key" => api_key })
            .to_return(status: 200, body: { items: [ { id: "company-1" } ] }.to_json)
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["base_url"]).to eq("https://sandbox.spedy.test/v1")
          expect(response.body).not_to include(api_key)
          expect(school.school_payment_providers.find(body.fetch("id")).settings)
            .to include("base_url" => "https://sandbox.spedy.test/v1")
        end
      end

      response "201", "exposes the default base_url when none was supplied" do
        before { stub_companies }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "base_url")).to eq(base_url)
        end
      end

      response "201", "uses a supplied company_id after confirming it" do
        let(:payload) { { api_key: api_key, company_id: "company-7" } }

        before do
          stub_request(:get, "#{base_url}/companies/company-7").to_return(status: 200, body: { id: "company-7" }.to_json)
        end

        run_test! do |response|
          record = school.school_payment_providers.find(JSON.parse(response.body).dig("data", "id"))
          expect(record.spedy_company_id).to eq("company-7")
        end
      end

      response "201", "supersedes the previous active row" do
        let!(:previous) { create(:school_payment_provider, :spedy, school: school) }

        before { stub_companies }

        run_test! do |response|
          expect(previous.reload.active).to be(false)
          new_id = JSON.parse(response.body).dig("data", "id")
          expect(school.school_payment_providers.active.where(instrument: "service_invoice").pluck(:id)).to eq([ new_id ])
        end
      end

      response "201", "provisions a company when api_key is omitted" do
        let(:payload) { {} }

        before do
          allow(Backoffice::ProvisionSpedyCompanyService).to receive(:call).and_return(
            ResponseService.success(data: create(:school_payment_provider, :spedy, school: school))
          )
        end

        run_test! do
          expect(Backoffice::ProvisionSpedyCompanyService).to have_received(:call).with(school: school, actor: school_admin)
        end
      end

      response "401", "not authenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
          expect(SchoolPaymentProvider.where(school: school)).to be_empty
        end
      end

      response "404", "not found for another school" do
        let(:school_id) { other_school.id }

        run_test! do
          expect(SchoolPaymentProvider.where(school: other_school)).to be_empty
        end
      end

      response "422", "blank api_key" do
        let(:payload) { { api_key: "" } }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error.dig("details", "api_key")).to eq([ "blank" ])
        end
      end

      response "422", "invalid base_url" do
        let(:payload) { { api_key: api_key, base_url: "http://insecure.spedy.test/v1" } }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error.dig("details", "base_url")).to eq([ "invalid" ])
          expect(SchoolPaymentProvider.where(school: school)).to be_empty
        end
      end

      response "422", "Spedy rejects the key" do
        before { stub_companies(status: 403, body: "") }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("provider_error")
          expect(error.dig("details", "message")).to match(/authentication failed/)
          expect(response.body).not_to include(api_key)
        end
      end

      response "422", "company id cannot be determined" do
        before { stub_companies(body: { items: [] }.to_json) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("fiscal_configuration_incomplete")
        end
      end
    end
  end
end
