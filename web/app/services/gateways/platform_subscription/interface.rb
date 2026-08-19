# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Interface
      def create_billing_account(account)
        raise NotImplementedError
      end

      def update_billing_account(external_customer_id:, account:)
        raise NotImplementedError
      end

      def create_checkout_session(request)
        raise NotImplementedError
      end

      def create_billing_portal_session(external_customer_id:)
        raise NotImplementedError
      end

      def create_subscription(request)
        raise NotImplementedError
      end

      def fetch_subscription(external_subscription_id:)
        raise NotImplementedError
      end

      def change_plan(external_subscription_id:, catalog_ref:)
        raise NotImplementedError
      end

      def cancel_subscription(external_subscription_id:, at_period_end:)
        raise NotImplementedError
      end

      def fetch_invoice(external_invoice_id:)
        raise NotImplementedError
      end

      def list_invoices(external_customer_id:, since: nil, limit: 100)
        raise NotImplementedError
      end

      def capabilities
        raise NotImplementedError
      end
    end
  end
end
