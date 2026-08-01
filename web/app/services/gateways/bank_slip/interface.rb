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

      def capabilities
        raise NotImplementedError
      end
    end
  end
end
