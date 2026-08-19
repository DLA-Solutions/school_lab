# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Iugu::Client, :iugu do
  let(:client) { described_class.new(api_token: "test-token", api_base_url: IUGU_TEST_API_BASE_URL) }

  it "sends Basic auth to the placeholder host" do
    stub_iugu_api(:get, "/v1/customers/1", status: 200, body: { id: "1" }.to_json,
                  headers: { "Content-Type" => "application/json" })

    client.get("/v1/customers/1")

    encoded = Base64.strict_encode64("test-token:")
    expect(WebMock).to have_requested(:get, "#{IUGU_TEST_API_BASE_URL}/v1/customers/1")
      .with(headers: { "Authorization" => "Basic #{encoded}" })
  end

  it "maps 422 to ValidationError" do
    stub_iugu_api(:post, "/v1/customers", status: 422, body: { errors: "invalid" }.to_json)

    expect { client.post("/v1/customers", body: {}) }.to raise_error(SchoolLab::Integrations::Iugu::ValidationError)
  end

  it "maps 401 to AuthenticationError" do
    stub_iugu_api(:get, "/v1/invoices/1", status: 401, body: "{}")

    expect { client.get("/v1/invoices/1") }.to raise_error(SchoolLab::Integrations::Iugu::AuthenticationError)
  end

  it "maps 500 to TransientError" do
    stub_iugu_api(:get, "/v1/invoices/1", status: 500, body: "{}")

    expect { client.get("/v1/invoices/1") }.to raise_error(SchoolLab::Integrations::Iugu::TransientError)
  end

  it "requires IUGU_API_TOKEN when building from Configuration" do
    ENV.delete("IUGU_API_TOKEN")

    expect { SchoolLab::Integrations::Iugu::Configuration.api_token }
      .to raise_error(SchoolLab::Integrations::Iugu::ConfigurationError)
  end
end
