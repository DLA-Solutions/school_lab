# frozen_string_literal: true

require "rails_helper"

# Inter's contract is deliberately NOT covered by the shared "a bank slip adapter" examples
# (spec/support/shared_examples/bank_slip_adapter.rb): that shared example asserts every
# presentation field is present immediately after `issue`, which is true for Cora/Fake but
# false for Inter by design — issuance is asynchronous and those fields only arrive later via
# a reconciliation re-fetch (see docs/open-questions.md, decision on async issuance).
RSpec.describe Gateways::BankSlip::Inter::Adapter do
  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:provider_config) do
    create(:school_payment_provider, :inter, school: school,
                                     certificate_pem: pair[:certificate_pem],
                                     private_key_pem: pair[:private_key_pem],
                                     client_id: "client-stage-001")
  end
  let(:adapter) { described_class.new(school: school) }
  let(:api_base) { INTER_TEST_API_BASE_URL.chomp("/") }
  let(:cobrancas_path) { "#{api_base}/cobranca/v3/cobrancas" }

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
      school_id: school.id,
      charge_id: 42,
      interest_rate_percent: BigDecimal("1.0")
    )
  end

  def cobranca_payload( # rubocop:disable Metrics/ParameterLists
    id: "uuid-123",
    situacao: "A_RECEBER",
    valor_nominal: "850.00",
    due_date: "2026-12-10",
    valor_total_recebido: nil,
    origem: nil,
    data_situacao: "2026-12-01",
    pix_emv: "00020126580014br.gov.bcb.pix0136test-emv"
  )
    {
      cobranca: {
        codigoSolicitacao: id,
        seuNumero: "42",
        situacao: situacao,
        dataSituacao: data_situacao,
        valorNominal: valor_nominal,
        valorTotalRecebido: valor_total_recebido,
        origemRecebimento: origem,
        dataVencimento: due_date
      },
      boleto: {
        nossoNumero: "00000004",
        codigoBarras: "23793934800000850003381286000000000000400000",
        linhaDigitavel: "23793.38128 60000.000003 00000.000400 1 93480000085000"
      },
      pix: pix_emv ? { pixCopiaECola: pix_emv } : nil
    }
  end

  before { stub_inter_token }

  describe "#issue" do
    it "returns a draft Issuance with no presentation fields yet" do
      stub_request(:post, cobrancas_path)
        .to_return(status: 200, body: { codigoSolicitacao: "uuid-123" }.to_json,
                   headers: { "Content-Type" => "application/json" })

      issuance = adapter.issue(issue_request)

      expect(issuance).to be_a(Gateways::BankSlip::ValueObjects::Issuance)
      expect(issuance.provider_invoice_id).to eq("uuid-123")
      expect(issuance.status).to eq("draft")
      expect(issuance.amount_cents).to eq(85_000)
      expect(issuance.boleto_url).to be_nil
      expect(issuance.digitable_line).to be_nil
      expect(issuance.barcode).to be_nil
      expect(issuance.our_number).to be_nil
      expect(issuance.pix_emv).to be_nil
    end

    it "sends the amount as decimal reais (not cents) and a full mora block" do
      stub_request(:post, cobrancas_path)
        .to_return(status: 200, body: { codigoSolicitacao: "uuid-123" }.to_json)

      adapter.issue(issue_request)

      expect(WebMock).to have_requested(:post, cobrancas_path).with { |req|
        body = JSON.parse(req.body)
        body["valorNominal"] == 850.0 &&
          body["mora"] == { "taxa" => 1.0, "codigo" => "TAXAMENSAL" } &&
          body["numDiasAgenda"] == 60 &&
          body["formasRecebimento"] == %w[BOLETO PIX]
      }
    end

    it "splits the payer's phone into ddd and telefone instead of a single field" do
      stub_request(:post, cobrancas_path)
        .to_return(status: 200, body: { codigoSolicitacao: "uuid-123" }.to_json)

      adapter.issue(issue_request)

      expect(WebMock).to have_requested(:post, cobrancas_path).with { |req|
        pagador = JSON.parse(req.body).fetch("pagador")
        pagador["ddd"] == "11" && pagador["telefone"] == "987654321"
      }
    end

    it "does not send an Idempotency-Key header — Inter dedupes server-side" do
      stub_request(:post, cobrancas_path)
        .to_return(status: 200, body: { codigoSolicitacao: "uuid-123" }.to_json)

      adapter.issue(issue_request)

      expect(WebMock).to have_requested(:post, cobrancas_path).with { |req|
        req.headers.keys.none? { |key| key.casecmp("Idempotency-Key").zero? }
      }
    end

    it "raises ValidationError for provider validation failures" do
      stub_request(:post, cobrancas_path)
        .to_return(status: 422, body: { violacoes: [ { campo: "pagador.cpfCnpj" } ] }.to_json)

      expect { adapter.issue(issue_request) }.to raise_error(Gateways::BankSlip::ValidationError)
    end

    it "raises TransientError for provider outages" do
      stub_request(:post, cobrancas_path).to_return(status: 503, body: "unavailable")

      expect { adapter.issue(issue_request) }.to raise_error(Gateways::BankSlip::TransientError)
    end

    it "raises ProviderError when billing URLs are missing" do
      with_inter_billing_urls(api_base_url: nil, token_url: nil) do
        expect { adapter.issue(issue_request) }
          .to raise_error(Gateways::BankSlip::ProviderError, /INTER_API_BASE_URL/)
      end
    end
  end

  describe "#fetch_invoice (simulating the webhook-triggered reconciliation re-fetch)" do
    it "returns a RemoteInvoice carrying the boleto and Pix presentation fields" do
      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload.to_json, headers: { "Content-Type" => "application/json" })

      invoice = adapter.fetch_invoice(provider_invoice_id: "uuid-123")

      expect(invoice).to be_a(Gateways::BankSlip::ValueObjects::RemoteInvoice)
      expect(invoice.status).to eq("open")
      expect(invoice.total_amount_cents).to eq(85_000)
      expect(invoice.digitable_line).to be_present
      expect(invoice.barcode).to be_present
      expect(invoice.our_number).to be_present
      expect(invoice.pix_emv).to be_present
      # No direct boleto PDF/URL field exists on this response — only a separate base64 PDF
      # endpoint, out of scope here.
      expect(invoice.boleto_url).to be_nil
    end

    it "builds a single RemotePayment from the aggregate fields once the invoice is paid" do
      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload(
          situacao: "RECEBIDO", valor_total_recebido: "850.00", origem: "PIX", data_situacao: "2026-12-05"
        ).to_json)

      invoice = adapter.fetch_invoice(provider_invoice_id: "uuid-123")

      expect(invoice.status).to eq("paid")
      expect(invoice.payments.size).to eq(1)
      payment = invoice.payments.first
      expect(payment.paid_amount_cents).to eq(85_000)
      expect(payment.payment_method).to eq("pix")
      expect(payment.provider_payment_id).to eq("inter-uuid-123-2026-12-05")
    end

    it "returns no payments while the invoice is still open" do
      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload(situacao: "A_RECEBER").to_json)

      invoice = adapter.fetch_invoice(provider_invoice_id: "uuid-123")

      expect(invoice.payments).to eq([])
    end
  end

  describe "#cancel" do
    it "cancels then re-fetches the full invoice, returning cancelled status" do
      stub_request(:post, "#{cobrancas_path}/uuid-123/cancelar")
        .with(body: { motivoCancelamento: "Cancelled via School Lab" }.to_json)
        .to_return(status: 200, body: "{}")
      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload(situacao: "CANCELADO").to_json,
                   headers: { "Content-Type" => "application/json" })

      cancelled = adapter.cancel(provider_invoice_id: "uuid-123")

      expect(cancelled).to be_a(Gateways::BankSlip::ValueObjects::Issuance)
      expect(cancelled.status).to eq("cancelled")
    end
  end

  describe "#list_invoices" do
    it "returns RemoteInvoice instances parsed from the cobrancas collection" do
      stub_request(:get, %r{\A#{Regexp.escape(cobrancas_path)}\?})
        .to_return(status: 200, body: { cobrancas: [ cobranca_payload ] }.to_json,
                   headers: { "Content-Type" => "application/json" })

      invoices = adapter.list_invoices(since: Date.new(2026, 12, 1))

      expect(invoices).to all(be_a(Gateways::BankSlip::ValueObjects::RemoteInvoice))
      expect(invoices.map(&:provider_invoice_id)).to include("uuid-123")
    end
  end

  describe "#capabilities" do
    it "declares Inter capabilities, with past_due_reissue out of scope for this PR" do
      caps = adapter.capabilities

      expect(caps.inline_pix).to be(true)
      expect(caps.native_notifications).to be(true)
      expect(caps.cancellation).to be(true)
      expect(caps.fine_and_interest).to be(true)
      expect(caps.past_due_reissue).to be(false)
    end
  end

  describe "status normalization" do
    it "maps a known Inter status and raises for an unknown one" do
      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload(situacao: "ATRASADO").to_json)

      expect(adapter.fetch_invoice(provider_invoice_id: "uuid-123").status).to eq("late")

      stub_request(:get, "#{cobrancas_path}/uuid-123")
        .to_return(status: 200, body: cobranca_payload(situacao: "MYSTERY").to_json)

      expect { adapter.fetch_invoice(provider_invoice_id: "uuid-123") }
        .to raise_error(Gateways::BankSlip::ProviderError, /Unmapped provider status/)
    end
  end
end
