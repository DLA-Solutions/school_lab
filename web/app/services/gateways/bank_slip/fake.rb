# frozen_string_literal: true

module Gateways
  module BankSlip
    class Fake
      include Interface

      PROVIDER = "fake"

      # `environment` is accepted for adapter substitutability; the fake has no hosts to target.
      def initialize(school:, environment: nil)
        @school = school
        @issued = {}
        @idempotency_index = {}
        @invoices = {}
      end

      def issue(request)
        existing_id = @idempotency_index[request.idempotency_key]
        return @issued.fetch(existing_id) if existing_id

        provider_invoice_id = "fake-#{school.id}-#{request.charge_id || SecureRandom.hex(4)}"
        issuance = ValueObjects::Issuance.new(
          provider_invoice_id: provider_invoice_id,
          boleto_url: "https://fake-psp.example/boleto/#{provider_invoice_id}",
          digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
          barcode: "23793934800000850003381286000000000000400000",
          our_number: "00000004",
          pix_emv: "00020126580014br.gov.bcb.pix#{provider_invoice_id}",
          status: "open"
        )

        invoice = ValueObjects::RemoteInvoice.new(
          provider_invoice_id: provider_invoice_id,
          status: "open",
          total_amount_cents: request.total_amount_cents,
          due_date: request.due_date,
          payments: []
        )

        @issued[provider_invoice_id] = issuance
        @idempotency_index[request.idempotency_key] = provider_invoice_id
        @invoices[provider_invoice_id] = invoice

        issuance
      end

      def cancel(provider_invoice_id:)
        invoice = fetch_invoice(provider_invoice_id: provider_invoice_id)
        updated = ValueObjects::RemoteInvoice.new(
          provider_invoice_id: invoice.provider_invoice_id,
          status: "cancelled",
          total_amount_cents: invoice.total_amount_cents,
          due_date: invoice.due_date,
          payments: invoice.payments
        )
        @invoices[provider_invoice_id] = updated

        issuance = @issued[provider_invoice_id]
        ValueObjects::Issuance.new(
          provider_invoice_id: provider_invoice_id,
          boleto_url: issuance.boleto_url,
          digitable_line: issuance.digitable_line,
          barcode: issuance.barcode,
          our_number: issuance.our_number,
          pix_emv: issuance.pix_emv,
          status: "cancelled"
        )
      end

      def fetch_invoice(provider_invoice_id:)
        @invoices.fetch(provider_invoice_id) do
          raise ProviderError, "Invoice not found: #{provider_invoice_id}"
        end
      end

      def list_invoices(since:, limit: 100)
        @invoices.values
                  .select { |invoice| invoice.due_date >= since }
                  .first(limit)
      end

      def settle_invoice!(provider_invoice_id:, payment_method: "pix", fine_amount_cents: 0, interest_amount_cents: 0,
                          paid_at: Time.current)
        invoice = fetch_invoice(provider_invoice_id: provider_invoice_id)
        payment = ValueObjects::RemotePayment.new(
          provider_payment_id: "fake-pay-#{provider_invoice_id}",
          paid_amount_cents: invoice.total_amount_cents + fine_amount_cents + interest_amount_cents,
          paid_at: paid_at,
          payment_method: payment_method,
          fine_amount_cents: fine_amount_cents,
          interest_amount_cents: interest_amount_cents
        )
        updated = ValueObjects::RemoteInvoice.new(
          provider_invoice_id: invoice.provider_invoice_id,
          status: "paid",
          total_amount_cents: invoice.total_amount_cents,
          due_date: invoice.due_date,
          payments: [ payment ]
        )
        @invoices[provider_invoice_id] = updated
        updated
      end

      def seed_open_invoice!(issuance:, charge:)
        @invoices[issuance.provider_invoice_id] = ValueObjects::RemoteInvoice.new(
          provider_invoice_id: issuance.provider_invoice_id,
          status: "open",
          total_amount_cents: charge.total_amount_cents,
          due_date: charge.due_date,
          payments: []
        )
      end

      def capabilities
        Capabilities.full
      end

      private

      attr_reader :school
    end
  end
end
