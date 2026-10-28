# frozen_string_literal: true

require "rails_helper"

# Bug fix coverage: `parse_payment` used to hard-`.fetch` `valorTotalRecebido` /
# `dataSituacao` / `origemRecebimento` straight off `cobranca`. Those three top-level keys
# are flagged in docs/open-questions.md as "inferred, not firsthand-confirmed" against a real
# Inter sandbox/production payload — a real Pix-settled cobrança may carry the settlement
# data nested under `pix` instead. A missing key used to raise a bare KeyError, which is not
# a Gateways::BankSlip::* error and therefore propagated uncaught through
# Billing::ReconcileInvoicePaymentService's rescue clauses, crashing the job with zero trace.
RSpec.describe Gateways::BankSlip::Inter::ResponseParser do
  def payload(cobranca_overrides: {}, boleto: {}, pix: {})
    {
      "cobranca" => {
        "codigoSolicitacao" => "uuid-123",
        "situacao" => "RECEBIDO",
        "dataSituacao" => "2026-12-05",
        "valorNominal" => "850.00",
        "valorTotalRecebido" => "850.00",
        "origemRecebimento" => "PIX",
        "dataVencimento" => "2026-12-10"
      }.merge(cobranca_overrides),
      "boleto" => boleto,
      "pix" => pix
    }
  end

  describe ".parse_invoice" do
    it "builds the payment from the confirmed top-level fields when they are present" do
      invoice = described_class.parse_invoice(payload)

      expect(invoice.status).to eq("paid")
      expect(invoice.payments.size).to eq(1)
      payment = invoice.payments.first
      expect(payment.paid_amount_cents).to eq(85_000)
      expect(payment.payment_method).to eq("pix")
      expect(payment.paid_at).to eq(Time.zone.parse("2026-12-05"))
      expect(payment.provider_payment_id).to eq("inter-uuid-123-2026-12-05")
    end

    it "returns no payments while the invoice is not paid, regardless of pix contents" do
      invoice = described_class.parse_invoice(
        payload(cobranca_overrides: { "situacao" => "A_RECEBER", "valorTotalRecebido" => nil,
                                       "origemRecebimento" => nil })
      )

      expect(invoice.payments).to eq([])
    end

    it "falls back to the pix sub-object when the top-level settlement fields are absent " \
       "(the documented, unconfirmed hypothesis for a real Pix-settled cobranca)" do
      invoice = described_class.parse_invoice(
        payload(
          cobranca_overrides: { "valorTotalRecebido" => nil, "dataSituacao" => nil, "origemRecebimento" => nil },
          pix: { "valor" => "850.00", "dataHoraPagamento" => "2026-12-05T10:30:00-03:00" }
        )
      )

      expect(invoice.payments.size).to eq(1)
      payment = invoice.payments.first
      expect(payment.paid_amount_cents).to eq(85_000)
      expect(payment.paid_at).to eq(Time.zone.parse("2026-12-05T10:30:00-03:00"))
      # origemRecebimento absent at top level, but the pix sub-object carries data — treated
      # as the strongest available signal that settlement arrived via Pix.
      expect(payment.payment_method).to eq("pix")
    end

    it "falls back to alternate pix key names for amount/timestamp" do
      invoice = described_class.parse_invoice(
        payload(
          cobranca_overrides: { "valorTotalRecebido" => nil, "dataSituacao" => nil, "origemRecebimento" => nil },
          pix: { "valorPago" => "850.00", "horario" => "2026-12-05T10:30:00-03:00" }
        )
      )

      payment = invoice.payments.first
      expect(payment.paid_amount_cents).to eq(85_000)
      expect(payment.paid_at).to eq(Time.zone.parse("2026-12-05T10:30:00-03:00"))
    end

    it "raises Gateways::BankSlip::ProviderError (never a bare KeyError) when a paid invoice " \
       "carries the settlement amount/timestamp in neither cobranca nor pix" do
      expect do
        described_class.parse_invoice(
          payload(cobranca_overrides: { "valorTotalRecebido" => nil, "dataSituacao" => nil }, pix: {})
        )
      end.to raise_error(Gateways::BankSlip::ProviderError, /settlement amount\/timestamp are missing/)
    end

    it "raises Gateways::BankSlip::ProviderError when only the amount is missing from both sources" do
      expect do
        described_class.parse_invoice(
          payload(cobranca_overrides: { "valorTotalRecebido" => nil }, pix: { "dataHoraPagamento" => "2026-12-05" })
        )
      end.to raise_error(Gateways::BankSlip::ProviderError)
    end

    # Bug fix coverage: the payer block (`cobranca.pagador`) is inferred by analogy with the
    # confirmed POST request shape — see docs/open-questions.md. Must parse it when present and
    # never raise when it is absent (nil is a legitimate, expected value here, unlike the
    # settlement-field case above).
    it "parses payer_cpf/payer_name when the pagador block is present" do
      invoice = described_class.parse_invoice(
        payload(cobranca_overrides: { "pagador" => { "cpfCnpj" => "123.456.789-01", "nome" => "Maria Silva" } })
      )

      expect(invoice.payer_cpf).to eq("12345678901")
      expect(invoice.payer_name).to eq("Maria Silva")
    end

    it "returns nil for payer_cpf/payer_name without raising when the pagador key is absent" do
      invoice = described_class.parse_invoice(payload)

      expect(invoice.payer_cpf).to be_nil
      expect(invoice.payer_name).to be_nil
    end
  end
end
