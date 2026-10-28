# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Inter::ErrorMapper do
  def mapped(error)
    described_class.map(error)
  rescue Gateways::BankSlip::Error => e
    e
  end

  let(:diagnostics) { { http_status: 403, provider_response: { "title" => "Forbidden" } } }

  {
    SchoolLab::Integrations::Inter::AuthenticationError => Gateways::BankSlip::AuthenticationError,
    SchoolLab::Integrations::Inter::TransientError => Gateways::BankSlip::TransientError,
    SchoolLab::Integrations::Inter::UnexpectedResponseError => Gateways::BankSlip::ProviderError
  }.each do |vendor_error, port_error|
    it "maps #{vendor_error.name.demodulize} to #{port_error.name.demodulize} forwarding status and body" do
      error = mapped(vendor_error.new("boom", http_status: 403, provider_response: { "title" => "Forbidden" }))

      expect(error).to be_a(port_error)
      expect(error.message).to eq("boom")
      expect(error.http_status).to eq(403)
      expect(error.provider_response).to eq("title" => "Forbidden")
    end
  end

  it "forwards details, status and body on validation errors" do
    vendor = SchoolLab::Integrations::Inter::ValidationError.new(
      "Provider validation error", details: { "campo" => "x" }, http_status: 422,
                                   provider_response: { "campo" => "x" }
    )

    error = mapped(vendor)

    expect(error).to be_a(Gateways::BankSlip::ValidationError)
    expect(error.details).to eq("campo" => "x")
    expect(error.http_status).to eq(422)
    expect(error.provider_response).to eq("campo" => "x")
  end

  it "maps configuration errors to ProviderError without provider data" do
    error = mapped(SchoolLab::Integrations::Inter::ConfigurationError.new("INTER_API_BASE_URL missing"))

    expect(error).to be_a(Gateways::BankSlip::ProviderError)
    expect(error.http_status).to be_nil
    expect(error.provider_response).to be_nil
  end

  it "maps connection errors to TransientError without provider data" do
    error = mapped(SchoolLab::Http::ConnectionError.new("timeout"))

    expect(error).to be_a(Gateways::BankSlip::TransientError)
    expect(error.http_status).to be_nil
    expect(error.provider_response).to be_nil
  end

  it "forwards the root cause of a raw connection error" do
    vendor = begin
      begin
        raise OpenSSL::SSL::SSLError, "certificate has expired"
      rescue OpenSSL::SSL::SSLError
        raise SchoolLab::Http::ConnectionError
      end
    rescue SchoolLab::Http::ConnectionError => e
      e
    end

    error = mapped(vendor)

    expect(error.message).to eq("Provider connection error")
    expect(error.cause_class).to eq("OpenSSL::SSL::SSLError")
    expect(error.cause_message).to eq("certificate has expired")
  end

  it "forwards the root cause carried by a vendor TransientError" do
    vendor = SchoolLab::Integrations::Inter::TransientError.new(
      "Provider connection error", cause_class: "Net::OpenTimeout", cause_message: "execution expired"
    )

    error = mapped(vendor)

    expect(error).to be_a(Gateways::BankSlip::TransientError)
    expect(error.message).to eq("Provider connection error")
    expect(error.cause_class).to eq("Net::OpenTimeout")
    expect(error.cause_message).to eq("execution expired")
  end

  it "re-raises unknown errors untouched" do
    expect { described_class.map(ArgumentError.new("nope")) }.to raise_error(ArgumentError, "nope")
  end
end
