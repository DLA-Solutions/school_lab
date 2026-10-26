# frozen_string_literal: true

module Gateways
  module BankSlip
    module Interface
      def issue(request)
        raise NotImplementedError
      end

      def cancel(provider_invoice_id:)
        raise NotImplementedError
      end

      def fetch_invoice(provider_invoice_id:)
        raise NotImplementedError
      end

      def list_invoices(since:, limit: 100)
        raise NotImplementedError
      end

      # Binary PDF of the boleto for `provider_invoice_id`. Only call when
      # `capabilities.boleto_pdf` is true; adapters that expose a hosted `boleto_url` instead
      # leave this unimplemented.
      def boleto_pdf(provider_invoice_id:)
        raise NotImplementedError
      end

      def capabilities
        raise NotImplementedError
      end
    end
  end
end
