# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::PiiRedactor do
  it "redacts formatted and raw CPF" do
    message = "Invalid payer 123.456.789-09 and raw 12345678909"

    expect(described_class.call(message)).to eq("Invalid payer [CPF] and raw [CPF]")
  end

  it "redacts email addresses" do
    expect(described_class.call("Contact guardian@school.test for help")).to eq("Contact [EMAIL] for help")
  end

  it "redacts Brazilian and E.164 phone numbers" do
    br = "Failed for (11) 98765-4321"
    e164 = "Callback +5511987654321 failed"

    expect(described_class.call(br)).to eq("Failed for [PHONE]")
    expect(described_class.call(e164)).to eq("Callback [PHONE] failed")
  end

  it "redacts PEM blocks, bearer tokens, and client_id values" do
    pem = <<~PEM
      TLS error: -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
      -----END PRIVATE KEY-----
    PEM
    token = "HTTP 401: Authorization Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig"
    client = 'Request failed: client_id="abc123-secret" rejected'

    expect(described_class.call(pem)).not_to include("BEGIN PRIVATE KEY")
    expect(described_class.call(pem)).to include("[PEM_REDACTED]")
    expect(described_class.call(token)).to eq("HTTP 401: Authorization Bearer [REDACTED]")
    expect(described_class.call(client)).to eq("Request failed: client_id=[REDACTED] rejected")
  end
end
