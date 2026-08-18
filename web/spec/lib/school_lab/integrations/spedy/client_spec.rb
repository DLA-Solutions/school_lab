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
