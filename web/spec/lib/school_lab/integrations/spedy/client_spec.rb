# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Spedy::Client do
  let(:base_url) { "https://spedy.test/v1" }
  let(:api_key) { "test-api-key" }
  let(:client) do
    described_class.new(
      api_key: api_key,
      api_urls: { api_base_url: base_url }
    )
  end

  before do
    stub_request(:get, %r{\A#{base_url}/service-invoices/cities})
      .with(headers: { "X-Api-Key" => api_key })
      .to_return(status: 200, body: { items: [ { code: 5_208_707, name: "Goiânia", state: "GO" } ] }.to_json)
  end

  describe "base URL joining" do
    it "appends the path to a base URL that already ends in /v1" do
      stub = stub_request(:get, "https://api.spedy.com.br/v1/companies").to_return(status: 200, body: "{}")

      described_class.new(api_key: api_key, api_urls: { api_base_url: "https://api.spedy.com.br/v1" }).list_companies

      expect(stub).to have_been_requested
    end

    it "tolerates a trailing slash on the base URL" do
      stub = stub_request(:get, "https://api.spedy.com.br/v1/companies/c-1").to_return(status: 200, body: "{}")

      described_class.new(api_key: api_key, api_urls: { api_base_url: "https://api.spedy.com.br/v1/" })
                     .fetch_company(company_id: "c-1")

      expect(stub).to have_been_requested
    end

    it "uses the default https://api.spedy.com.br/v1 when no urls are given" do
      stub = stub_request(:get, "https://api.spedy.com.br/v1/companies").to_return(status: 200, body: "{}")

      with_spedy_env(nil) { described_class.new(api_key: api_key).list_companies }

      expect(stub).to have_been_requested
    end

    it "honours the SPEDY_API_BASE_URL override" do
      stub = stub_request(:get, "https://sandbox.spedy.test/v1/companies").to_return(status: 200, body: "{}")

      with_spedy_env("https://sandbox.spedy.test/v1/") { described_class.new(api_key: api_key).list_companies }

      expect(stub).to have_been_requested
    end

    def with_spedy_env(value)
      previous = ENV.fetch("SPEDY_API_BASE_URL", nil)
      value.nil? ? ENV.delete("SPEDY_API_BASE_URL") : ENV["SPEDY_API_BASE_URL"] = value
      yield
    ensure
      previous.nil? ? ENV.delete("SPEDY_API_BASE_URL") : ENV["SPEDY_API_BASE_URL"] = previous
    end
  end

  describe "#list_cities" do
    it "returns city list JSON" do
      response = client.list_cities(query: "Goiânia")
      expect(JSON.parse(response)["items"].first["name"]).to eq("Goiânia")
    end
  end

  describe "#list_companies" do
    it "sends the api key and returns the company list JSON" do
      stub = stub_request(:get, "#{base_url}/companies")
             .with(headers: { "X-Api-Key" => api_key })
             .to_return(status: 200, body: { items: [ { id: "company-1" } ] }.to_json)

      response = client.list_companies

      expect(JSON.parse(response)["items"].first["id"]).to eq("company-1")
      expect(stub).to have_been_requested
    end

    it "passes pagination params" do
      stub = stub_request(:get, "#{base_url}/companies?page=2&pageSize=10").to_return(status: 200, body: "{}")

      client.list_companies(page: 2, page_size: 10)

      expect(stub).to have_been_requested
    end

    it "raises AuthenticationError when the key is rejected" do
      stub_request(:get, "#{base_url}/companies").to_return(status: 403, body: "")

      expect { client.list_companies }
        .to raise_error(SchoolLab::Integrations::Spedy::AuthenticationError, /403/)
    end

    it "raises TransientError when the provider is unreachable" do
      stub_request(:get, "#{base_url}/companies").to_timeout

      expect { client.list_companies }.to raise_error(SchoolLab::Integrations::Spedy::TransientError)
    end
  end

  describe "#fetch_company" do
    it "requests the company by id" do
      stub_request(:get, "#{base_url}/companies/company-1")
        .with(headers: { "X-Api-Key" => api_key })
        .to_return(status: 200, body: { id: "company-1" }.to_json)

      expect(JSON.parse(client.fetch_company(company_id: "company-1"))["id"]).to eq("company-1")
    end

    it "raises ValidationError on 400" do
      stub_request(:get, "#{base_url}/companies/missing").to_return(status: 400, body: { message: "nope" }.to_json)

      expect { client.fetch_company(company_id: "missing") }
        .to raise_error(SchoolLab::Integrations::Spedy::ValidationError)
    end
  end

  describe "rate limiting" do
    before do
      stub_request(:post, "#{base_url}/service-invoices")
        .to_return(status: 429, body: { message: "Too many requests" }.to_json)
    end

    it "raises TransientError on 429" do
      expect do
        client.create_service_invoice(body: { integrationId: "pay-1" })
      end.to raise_error(SchoolLab::Integrations::Spedy::TransientError, /429/)
    end
  end
end
