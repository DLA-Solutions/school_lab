# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Asaas::Client, :asaas do
  let(:client) { described_class.new(api_token: "test-token", api_base_url: ASAAS_TEST_API_BASE_URL) }

  it "sends access_token header to the placeholder host" do
    stub_asaas_api(:get, "/v3/customers/cus_1", status: 200, body: { id: "cus_1" }.to_json,
                   headers: { "Content-Type" => "application/json" })

    client.get("/v3/customers/cus_1")

    expect(WebMock).to have_requested(:get, "#{ASAAS_TEST_API_BASE_URL}/v3/customers/cus_1")
      .with(headers: { "access_token" => "test-token" })
  end

  it "maps 422 to ValidationError" do
    stub_asaas_api(:post, "/v3/customers", status: 422, body: { errors: [ { code: "invalid" } ] }.to_json)

    expect { client.post("/v3/customers", body: {}) }.to raise_error(SchoolLab::Integrations::Asaas::ValidationError)
  end

  it "maps 401 to AuthenticationError" do
    stub_asaas_api(:get, "/v3/payments/pay_1", status: 401, body: "{}")

    expect { client.get("/v3/payments/pay_1") }.to raise_error(SchoolLab::Integrations::Asaas::AuthenticationError)
  end

  it "maps 500 to TransientError" do
    stub_asaas_api(:get, "/v3/payments/pay_1", status: 500, body: "{}")

    expect { client.get("/v3/payments/pay_1") }.to raise_error(SchoolLab::Integrations::Asaas::TransientError)
  end

  it "requires ASAAS_API_TOKEN when building from Configuration" do
    ENV.delete("ASAAS_API_TOKEN")

    expect { SchoolLab::Integrations::Asaas::Configuration.api_token }
      .to raise_error(SchoolLab::Integrations::Asaas::ConfigurationError)
  end
end
