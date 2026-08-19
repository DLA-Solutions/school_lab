# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    class Manual
      include Interface

      PROVIDER = "manual"

      def create_billing_account(account)
        ValueObjects::BillingAccount.new(
          name: account.name,
          email: account.email,
          document_number: account.document_number,
          external_id: account.external_id.presence || "manual-cust-#{SecureRandom.hex(6)}"
        )
      end

      def update_billing_account(external_customer_id:, account:)
        ValueObjects::BillingAccount.new(
          name: account.name,
          email: account.email,
          document_number: account.document_number,
          external_id: external_customer_id
        )
      end

      def create_checkout_session(_request)
        raise NotSupportedError.new("Manual adapter does not host checkout", error_code: :not_implemented)
      end

      def create_billing_portal_session(external_customer_id:)
        raise NotSupportedError.new("Manual adapter has no billing portal", error_code: :portal_not_supported)
      end

      def create_subscription(request)
        now = Time.current
        status = request.trial ? "trialing" : "active"

        ValueObjects::RemoteSubscription.new(
          external_subscription_id: "manual-sub-#{SecureRandom.hex(6)}",
          external_customer_id: request.existing_customer_id.presence || "manual-cust-#{SecureRandom.hex(6)}",
          status: status,
          plan_identifier: request.catalog_ref.external_price_id,
          current_period_start: now,
          current_period_end: period_end_for(request.catalog_ref.billing_interval, now),
          trial_ends_at: request.trial ? now + request.trial_days.days : nil,
          cancel_at_period_end: false
        )
      end

      def fetch_subscription(external_subscription_id:)
        raise ProviderError, "Subscription not found: #{external_subscription_id}"
      end

      def change_plan(external_subscription_id:, catalog_ref:)
        now = Time.current
        ValueObjects::RemoteSubscription.new(
          external_subscription_id: external_subscription_id,
          external_customer_id: "manual-cust",
          status: "active",
          plan_identifier: catalog_ref.external_price_id,
          current_period_start: now,
          current_period_end: period_end_for(catalog_ref.billing_interval, now)
        )
      end

      def cancel_subscription(external_subscription_id:, at_period_end:)
        now = Time.current
        ValueObjects::RemoteSubscription.new(
          external_subscription_id: external_subscription_id,
          external_customer_id: "manual-cust",
          status: at_period_end ? "active" : "canceled",
          current_period_end: now + 30.days,
          cancel_at_period_end: at_period_end,
          canceled_at: at_period_end ? nil : now
        )
      end

      def fetch_invoice(external_invoice_id:)
        raise ProviderError, "Invoice not found: #{external_invoice_id}"
      end

      def list_invoices(external_customer_id:, since: nil, limit: 100)
        []
      end

      def capabilities
        Capabilities.none
      end

      private

      def period_end_for(interval, from)
        interval.to_s == "year" ? from + 1.year : from + 1.month
      end
    end
  end
end
