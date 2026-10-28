# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IssuanceErrorSerializer do
  include ActiveSupport::Testing::TimeHelpers

  let(:occurred_at) { Time.utc(2026, 10, 28, 12, 0, 0) }
  let(:parsed) { JSON.parse(json) }

  def serialize(error)
    described_class.call(error, occurred_at: occurred_at)
  end

  describe ".call" do
    context "with a port error carrying the provider response" do
      let(:error) do
        Gateways::BankSlip::ValidationError.new(
          "Provider validation error",
          details: { "violacoes" => [ { "campo" => "pagador.cpfCnpj" } ] },
          http_status: 422,
          provider_response: { "violacoes" => [ { "campo" => "pagador.cpfCnpj", "valor" => 12_345 } ] }
        )
      end
      let(:json) { serialize(error) }

      it "stores class, message, status, provider response and timestamp" do
        expect(parsed).to eq(
          "error_class" => "Gateways::BankSlip::ValidationError",
          "message" => "Provider validation error",
          "http_status" => 422,
          "provider_response" => { "violacoes" => [ { "campo" => "pagador.cpfCnpj", "valor" => 12_345 } ] },
          "occurred_at" => "2026-10-28T12:00:00Z"
        )
      end
    end

    context "with an error that has no provider data" do
      let(:json) { serialize(Billing::IssueChargeService::MissingInterestRateError.new) }

      it "keeps class and message and omits nil keys" do
        expect(parsed).to eq(
          "error_class" => "Billing::IssueChargeService::MissingInterestRateError",
          "message" => "interest_rate_percent is not configured for school",
          "occurred_at" => "2026-10-28T12:00:00Z"
        )
      end
    end

    context "with a port error whose provider response is nil" do
      let(:json) { serialize(Gateways::BankSlip::TransientError.new("Provider connection error")) }

      it "omits the provider fields" do
        expect(parsed.keys).to contain_exactly("error_class", "message", "occurred_at")
      end
    end

    context "with a validation error exposing only details (Cora)" do
      let(:json) do
        serialize(Gateways::BankSlip::ValidationError.new("Rejected", details: { "field" => "email" }))
      end

      it "falls back to details as the provider response" do
        expect(parsed["provider_response"]).to eq("field" => "email")
      end
    end

    context "with a provider response that is a raw string" do
      let(:json) do
        serialize(Gateways::BankSlip::AuthenticationError.new("denied", http_status: 401,
                                                                        provider_response: "invalid token"))
      end

      it "keeps the string" do
        expect(parsed).to include("http_status" => 401, "provider_response" => "invalid token")
      end
    end

    describe "redaction" do
      let(:pem) { "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----" }
      let(:error) do
        Gateways::BankSlip::ProviderError.new(
          "failed for 123.456.789-00",
          http_status: 400,
          provider_response: {
            "pagador" => { "cpfCnpj" => "12345678901", "email" => "maria@example.com", "telefone" => "+55 11 98765-4321" },
            "detail" => "Bearer abc.def.ghi rejected; key #{pem}",
            "cpf_number" => 12_345_678_901,
            "items" => [ "CPF 987.654.321-00", 7, true, nil ],
            "amount" => 85_000,
            "client_id=secret-id" => "x"
          }
        )
      end
      let(:json) { serialize(error) }

      it "redacts every string leaf and keeps the output valid JSON with numbers intact" do
        expect(parsed["message"]).to eq("failed for [CPF]")
        response = parsed["provider_response"]
        expect(response["pagador"]).to eq("cpfCnpj" => "[CPF]", "email" => "[EMAIL]", "telefone" => "[PHONE]")
        expect(response["detail"]).to eq("Bearer [REDACTED] rejected; key [PEM_REDACTED]")
        expect(response["cpf_number"]).to eq("[CPF]")
        expect(response["items"]).to eq([ "CPF [CPF]", 7, true, nil ])
        expect(response["amount"]).to eq(85_000)
        expect(response.keys).to include("client_id=[REDACTED]")
      end

      it "leaks none of the sensitive values into the stored text" do
        %w[123.456.789-00 12345678901 987.654.321-00 maria@example.com abc.def.ghi MIIEvQIBADANBgkq secret-id]
          .each { |secret| expect(json).not_to include(secret) }
      end
    end

    describe "size cap" do
      let(:pem_tail) { "MIIEvQIBADANBgkq" * 20 }

      it "truncates large string leaves and keeps valid JSON within the cap" do
        error = Gateways::BankSlip::ProviderError.new(
          "big", http_status: 500, provider_response: { "detail" => "x" * 50_000 }
        )

        json = serialize(error)

        expect(json.bytesize).to be <= described_class::MAX_BYTES
        expect(JSON.parse(json)["provider_response"]["detail"]).to end_with("[truncated]")
      end

      it "shrinks leaves further when many keys together exceed the cap" do
        response = (1..30).to_h { |index| [ "field_#{index}", "y" * 2_000 ] }
        error = Gateways::BankSlip::ProviderError.new("big", http_status: 400, provider_response: response)

        json = serialize(error)

        expect(json.bytesize).to be <= described_class::MAX_BYTES
        expect(JSON.parse(json)["provider_response"].keys).to eq(response.keys)
      end

      it "drops the provider response marker-first when nothing else fits" do
        response = (1..30).to_h { |index| [ "k#{index}", (1..30).to_h { |inner| [ "n#{inner}", "z" * 500 ] } ] }
        error = Gateways::BankSlip::ProviderError.new("big", http_status: 400, provider_response: response)

        json = serialize(error)

        expect(json.bytesize).to be <= described_class::MAX_BYTES
        expect(JSON.parse(json)).to include("http_status" => 400, "provider_response" => { "truncated" => true })
      end

      it "caps array length and nesting depth" do
        deep = (1..12).reduce("leaf") { |inner, _| { "n" => inner } }
        error = Gateways::BankSlip::ProviderError.new(
          "big", provider_response: { "list" => (1..100).to_a, "deep" => deep }
        )

        response = JSON.parse(serialize(error))["provider_response"]

        expect(response["list"].size).to eq(described_class::MAX_ITEMS + 1)
        expect(response["list"].last).to eq("[70 more items truncated]")
        expect(response.to_json).to include('"[truncated]"')
      end

      it "does not cut a PEM block before redacting it" do
        pem = "-----BEGIN PRIVATE KEY-----\n#{pem_tail}\n-----END PRIVATE KEY-----"
        error = Gateways::BankSlip::ProviderError.new("x", provider_response: { "detail" => ("a" * 990) + pem })

        expect(serialize(error)).not_to include("MIIEvQIBADANBgkq")
      end
    end

    it "survives invalid UTF-8 in the provider body" do
      error = Gateways::BankSlip::ProviderError.new("bad", provider_response: "caf\xE9".b)

      expect(JSON.parse(serialize(error))["provider_response"]).to eq("caf?")
    end

    it "defaults occurred_at to the current time" do
      travel_to(Time.utc(2026, 1, 2, 3, 4, 5)) do
        expect(JSON.parse(described_class.call(StandardError.new("x")))["occurred_at"]).to eq("2026-01-02T03:04:05Z")
      end
    end
  end

  describe ".summary" do
    it "describes the stored JSON in one redacted line" do
      stored = described_class.call(
        Gateways::BankSlip::ValidationError.new("Rejected 123.456.789-00", http_status: 422,
                                                                           provider_response: { "a" => "b" })
      )

      expect(described_class.summary(stored))
        .to eq("Gateways::BankSlip::ValidationError: Rejected [CPF] (HTTP 422)")
    end

    it "passes legacy plain-message rows through redacted" do
      expect(described_class.summary("CPF 123.456.789-00 invalid")).to eq("CPF [CPF] invalid")
    end

    it "treats JSON without an error_class as plain text and handles nil" do
      expect(described_class.summary('{"other":1}')).to eq('{"other":1}')
      expect(described_class.summary(nil)).to eq("")
    end

    it "caps the summary length" do
      stored = described_class.call(StandardError.new("m" * 5_000))

      expect(described_class.summary(stored).length).to be <= described_class::SUMMARY_LIMIT
    end
  end
end
