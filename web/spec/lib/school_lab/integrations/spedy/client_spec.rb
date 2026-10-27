# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Spedy::Client do
  let(:base_url) { "https://spedy.test" }
  let(:api_key) { "test-api-key" }
  let(:client) do
    described_class.new(
      api_key: api_key,
      api_urls: { api_base_url: base_url }
    )
  end

  before do
    stub_request(:get, %r{\A#{base_url}/v1/service-invoices/cities})
      .with(headers: { "X-Api-Key" => api_key })
      .to_return(status: 200, body: { items: [ { code: 5_208_707, name: "Goiânia", state: "GO" } ] }.to_json)
  end

  describe "#list_cities" do
    it "returns city list JSON" do
      response = client.list_cities(query: "Goiânia")
      expect(JSON.parse(response)["items"].first["name"]).to eq("Goiânia")
    end
  end

  describe "#list_companies" do
    it "sends the api key and returns the company list JSON" do
      stub = stub_request(:get, "#{base_url}/v1/companies")
             .with(headers: { "X-Api-Key" => api_key })
             .to_return(status: 200, body: { items: [ { id: "company-1" } ] }.to_json)

      response = client.list_companies

      expect(JSON.parse(response)["items"].first["id"]).to eq("company-1")
      expect(stub).to have_been_requested
    end

    it "passes pagination params" do
      stub = stub_request(:get, "#{base_url}/v1/companies?page=2&pageSize=10").to_return(status: 200, body: "{}")

      client.list_companies(page: 2, page_size: 10)

      expect(stub).to have_been_requested
    end

    it "raises AuthenticationError when the key is rejected" do
      stub_request(:get, "#{base_url}/v1/companies").to_return(status: 403, body: "")

      expect { client.list_companies }
        .to raise_error(SchoolLab::Integrations::Spedy::AuthenticationError, /403/)
    end

    it "raises TransientError when the provider is unreachable" do
      stub_request(:get, "#{base_url}/v1/companies").to_timeout

      expect { client.list_companies }.to raise_error(SchoolLab::Integrations::Spedy::TransientError)
    end
  end

  describe "#fetch_company" do
    it "requests the company by id" do
      stub_request(:get, "#{base_url}/v1/companies/company-1")
        .with(headers: { "X-Api-Key" => api_key })
        .to_return(status: 200, body: { id: "company-1" }.to_json)

      expect(JSON.parse(client.fetch_company(company_id: "company-1"))["id"]).to eq("company-1")
    end

    it "raises ValidationError on 400" do
      stub_request(:get, "#{base_url}/v1/companies/missing").to_return(status: 400, body: { message: "nope" }.to_json)

      expect { client.fetch_company(company_id: "missing") }
        .to raise_error(SchoolLab::Integrations::Spedy::ValidationError)
    end
  end

  describe "rate limiting" do
    before do
      stub_request(:post, "#{base_url}/v1/service-invoices")
        .to_return(status: 429, body: { message: "Too many requests" }.to_json)
    end

    it "raises TransientError on 429" do
      expect do
        client.create_service_invoice(body: { integrationId: "pay-1" })
      end.to raise_error(SchoolLab::Integrations::Spedy::TransientError, /429/)
    end
  end
end
