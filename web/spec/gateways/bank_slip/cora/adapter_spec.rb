# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Cora::Adapter do
  it_behaves_like "a bank slip adapter", "cora"

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:provider_config) do
    create(:school_payment_provider, school: school, provider: "cora",
                                     certificate_pem: pair[:certificate_pem],
                                     private_key_pem: pair[:private_key_pem],
                                     client_id: "client-stage-001")
  end
  let(:adapter) { described_class.new(school: school) }
  let(:api_base) { CORA_TEST_API_BASE_URL.chomp("/") }

  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(
      name: "Maria Silva",
      document_number: "12345678901",
      email: "maria@example.com",
      phone: "+5511987654321"
    )
  end

  let(:issue_request) do
    Gateways::BankSlip::ValueObjects::IssueRequest.new(
      idempotency_key: "idempotent-key-123",
      total_amount_cents: 85_000,
      due_date: Date.new(2026, 12, 10),
      customer: customer,
      service_description: I18n.t("billing.settings.default_service_description"),
      school_id: school.id,
      charge_id: 42,
      interest_rate_percent: BigDecimal("1.0")
    )
  end

  def invoice_payload( # rubocop:disable Metrics/ParameterLists
    id: "inv_test123",
    status: "OPEN",
    total_amount: 85_000,
    due_date: "2026-12-10",
    pix_emv: "00020126580014br.gov.bcb.pix0136test-emv"
  )
    {
      id: id,
      status: status,
      total_amount: total_amount,
      payment_terms: { due_date: due_date },
      payment_options: {
        bank_slip: {
          barcode: "23793934800000850003381286000000000000400000",
          digitable: "23793.38128 60000.000003 00000.000400 1 93480000085000",
          our_number: "00000004",
          url: "https://example.test/boleto/#{id}.pdf"
        }
      },
      pix: pix_emv ? { emv: pix_emv } : nil,
      payments: []
    }
  end

  before do
    stub_cora_token

    stub_request(:post, %r{\A#{Regexp.escape(api_base)}/v2/invoices/?\z})
      .to_return(status: 200, body: invoice_payload.to_json, headers: { "Content-Type" => "application/json" })

    stub_request(:delete, %r{\A#{Regexp.escape(api_base)}/v2/invoices/})
      .to_return do |_request|
        @invoice_cancelled = true
        { status: 200, body: "{}" }
      end

    stub_request(:get, %r{\A#{Regexp.escape(api_base)}/v2/invoices/missing-})
      .to_return(status: 404, body: "{}")

    stub_request(:get, %r{\A#{Regexp.escape(api_base)}/v2/invoices/inv_test123\z})
      .to_return do |_request|
        status = @invoice_cancelled ? "CANCELLED" : "OPEN"
        {
          status: 200,
          body: invoice_payload(status: status).to_json,
          headers: { "Content-Type" => "application/json" }
        }
      end

    stub_request(:get, %r{\A#{Regexp.escape(api_base)}/v2/invoices/\?})
      .to_return(
        status: 200,
        body: { items: [ invoice_payload ] }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end

  around do |example|
    @invoice_cancelled = false
    example.run
  end

  describe "#issue" do
    it "posts to Cora with payment forms and the persisted idempotency key" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .with(headers: { "Idempotency-Key" => "idempotent-key-123" })
        .to_return(status: 200, body: invoice_payload.to_json, headers: { "Content-Type" => "application/json" })

      issuance = adapter.issue(issue_request)

      expect(WebMock).to have_requested(:post, "#{api_base}/v2/invoices/")
        .with { |req| JSON.parse(req.body)["payment_forms"] == %w[BANK_SLIP PIX] }
      expect(WebMock).to have_requested(:post, "#{api_base}/v2/invoices/").with { |req|
        body = JSON.parse(req.body)
        body.dig("payment_terms", "interest", "rate") == 1.0 && body.dig("payment_terms", "fine").nil?
      }
      expect(issuance.provider_invoice_id).to eq("inv_test123")
      expect(issuance.boleto_url).to be_present
      expect(issuance.digitable_line).to be_present
      expect(issuance.barcode).to be_present
      expect(issuance.our_number).to be_present
      expect(issuance.pix_emv).to be_present
      expect(issuance.amount_cents).to eq(85_000)
      expect(issuance.amount_cents).to be_a(Integer)
    end

    it "returns nil pix_emv when the provider response has no pix payload" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 200, body: invoice_payload(pix_emv: nil).to_json)

      issuance = adapter.issue(issue_request)

      expect(issuance.pix_emv).to be_nil
      expect(issuance.boleto_url).to be_present
    end

    it "returns the same invoice for duplicate idempotency keys" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 200, body: invoice_payload(id: "inv_original").to_json)

      first = adapter.issue(issue_request)
      second = adapter.issue(issue_request)

      expect(second.provider_invoice_id).to eq(first.provider_invoice_id)
    end

    it "raises ValidationError for provider validation failures" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 422, body: { errors: [ { field: "customer.email" } ] }.to_json)

      expect { adapter.issue(issue_request) }
        .to raise_error(Gateways::BankSlip::ValidationError) { |error|
          expect(error.details).to be_present
          expect(error.message).not_to include("maria@example.com")
          expect(error.message).not_to include("12345678901")
        }
    end

    it "raises TransientError for provider outages" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 503, body: "unavailable")

      expect { adapter.issue(issue_request) }
        .to raise_error(Gateways::BankSlip::TransientError)
    end

    it "raises ProviderError when billing URLs are missing" do
      with_cora_billing_urls(api_base_url: nil, token_url: nil) do
        expect { adapter.issue(issue_request) }
          .to raise_error(Gateways::BankSlip::ProviderError, /CORA_API_BASE_URL/)
      end
    end
  end

  describe "endpoint selection" do
    let(:alt_api_base) { CORA_ALT_API_BASE_URL.chomp("/") }

    before do
      stub_request(:post, CORA_ALT_TOKEN_URL)
        .to_return(
          status: 200,
          body: { access_token: "alt-token", expires_in: 86_400 }.to_json,
          headers: { "Content-Type" => "application/json" }
        )
      stub_request(:post, "#{alt_api_base}/v2/invoices/")
        .to_return(status: 200, body: invoice_payload.to_json, headers: { "Content-Type" => "application/json" })
    end

    it "issues against alternate billing URLs when ENV points there" do
      with_cora_billing_urls(api_base_url: CORA_ALT_API_BASE_URL, token_url: CORA_ALT_TOKEN_URL) do
        Gateways::BankSlip::Registry.resolve(school: school, provider: "cora").issue(issue_request)
      end

      expect(WebMock).to have_requested(:post, "#{alt_api_base}/v2/invoices/")
      expect(WebMock).not_to have_requested(:post, "#{api_base}/v2/invoices/")
    end

    it "uses the default test billing URLs from the suite setup" do
      Gateways::BankSlip::Registry.resolve(school: school, provider: "cora").issue(issue_request)

      expect(WebMock).to have_requested(:post, "#{api_base}/v2/invoices/")
      expect(WebMock).not_to have_requested(:post, "#{alt_api_base}/v2/invoices/")
      expect(WebMock).not_to have_requested(:post, CORA_ALT_TOKEN_URL)
    end

    it "fails explicitly when the school has no active configuration" do
      unconfigured = create(:school)

      expect { Gateways::BankSlip::Registry.resolve(school: unconfigured, provider: "cora") }
        .to raise_error(Gateways::BankSlip::Registry::UnknownProviderError, /No active bank_slip configuration/)
    end
  end

  describe "#capabilities" do
    it "declares Cora capabilities" do
      caps = adapter.capabilities

      expect(caps.inline_pix).to be(true)
      expect(caps.native_notifications).to be(true)
      expect(caps.cancellation).to be(true)
      expect(caps.fine_and_interest).to be(true)
      expect(caps.past_due_reissue).to be(false)
    end
  end

  describe "status normalization" do
    it "maps known Cora statuses and raises for unknown values" do
      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 200, body: invoice_payload(status: "OPEN").to_json)

      expect(adapter.issue(issue_request).status).to eq("open")

      stub_request(:post, "#{api_base}/v2/invoices/")
        .to_return(status: 200, body: invoice_payload(status: "MYSTERY").to_json)

      expect { adapter.issue(issue_request) }
        .to raise_error(Gateways::BankSlip::ProviderError, /Unmapped provider status/)
    end
  end
end
