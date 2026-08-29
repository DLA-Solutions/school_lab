# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    class Fake
      include Interface

      PROVIDER = "fake"

      def initialize
        @customers = {}
        @subscriptions = {}
        @invoices = {}
      end

      def create_billing_account(account)
        id = account.external_id.presence || "fake-cust-#{SecureRandom.hex(6)}"
        stored = ValueObjects::BillingAccount.new(
          name: account.name,
          email: account.email,
          document_number: account.document_number,
          external_id: id
        )
        @customers[id] = stored
        stored
      end

      def update_billing_account(external_customer_id:, account:)
        @customers.fetch(external_customer_id) do
          raise ProviderError, "Customer not found: #{external_customer_id}"
        end

        updated = ValueObjects::BillingAccount.new(
          name: account.name,
          email: account.email,
          document_number: account.document_number,
          external_id: external_customer_id
        )
        @customers[external_customer_id] = updated
        updated
      end

      def create_checkout_session(request)
        remote = create_subscription(
          ValueObjects::SubscriptionRequest.new(
            account: request.account,
            catalog_ref: request.catalog_ref,
            trial: request.trial,
            trial_days: request.trial_days,
            existing_customer_id: request.existing_customer_id
          )
        )
        invoice = persist_invoice_for(remote, request.catalog_ref)

        ValueObjects::CheckoutSession.new(
          checkout_url: invoice.hosted_invoice_url,
          billing_portal_url: nil,
          external_customer_id: remote.external_customer_id,
          external_subscription_id: remote.external_subscription_id,
          external_invoice_id: invoice.external_invoice_id,
          status: remote.status,
          invoice: invoice
        )
      end

      def create_billing_portal_session(external_customer_id:)
        raise NotSupportedError.new("Fake adapter has no billing portal", error_code: :portal_not_supported)
      end

      def create_subscription(request)
        customer_id = request.existing_customer_id.presence || create_billing_account(request.account).external_id
        now = Time.current
        status = request.trial ? "trialing" : "incomplete"
        sub_id = "fake-sub-#{SecureRandom.hex(6)}"
        remote = ValueObjects::RemoteSubscription.new(
          external_subscription_id: sub_id,
          external_customer_id: customer_id,
          status: status,
          plan_identifier: request.catalog_ref.external_price_id,
          current_period_start: now,
          current_period_end: period_end_for(request.catalog_ref.billing_interval, now),
          trial_ends_at: request.trial ? now + request.trial_days.days : nil,
          latest_invoice_url: "https://asaas.test/invoices/#{sub_id}"
        )
        @subscriptions[sub_id] = remote
        persist_invoice_for(remote, request.catalog_ref)
        @subscriptions[sub_id]
      end

      def fetch_subscription(external_subscription_id:)
        @subscriptions.fetch(external_subscription_id) do
          raise ProviderError, "Subscription not found: #{external_subscription_id}"
        end
      end

      def change_plan(external_subscription_id:, catalog_ref:)
        remote = fetch_subscription(external_subscription_id: external_subscription_id)
        updated = ValueObjects::RemoteSubscription.new(
          external_subscription_id: remote.external_subscription_id,
          external_customer_id: remote.external_customer_id,
          status: remote.status == "incomplete" ? "active" : remote.status,
          plan_identifier: catalog_ref.external_price_id,
          current_period_start: Time.current,
          current_period_end: period_end_for(catalog_ref.billing_interval, Time.current),
          trial_ends_at: remote.trial_ends_at,
          cancel_at_period_end: remote.cancel_at_period_end,
          canceled_at: remote.canceled_at
        )
        @subscriptions[external_subscription_id] = updated
        persist_invoice_for(updated, catalog_ref)
        @subscriptions[external_subscription_id]
      end

      def cancel_subscription(external_subscription_id:, at_period_end:)
        remote = fetch_subscription(external_subscription_id: external_subscription_id)
        updated = ValueObjects::RemoteSubscription.new(
          external_subscription_id: remote.external_subscription_id,
          external_customer_id: remote.external_customer_id,
          status: at_period_end ? remote.status : "canceled",
          plan_identifier: remote.plan_identifier,
          current_period_start: remote.current_period_start,
          current_period_end: remote.current_period_end,
          trial_ends_at: remote.trial_ends_at,
          cancel_at_period_end: at_period_end,
          canceled_at: at_period_end ? nil : Time.current,
          latest_invoice_id: remote.latest_invoice_id,
          latest_invoice_url: remote.latest_invoice_url
        )
        @subscriptions[external_subscription_id] = updated
        updated
      end

      def fetch_invoice(external_invoice_id:)
        @invoices.fetch(external_invoice_id) do
          raise ProviderError, "Invoice not found: #{external_invoice_id}"
        end
      end

      def list_invoices(external_customer_id:, since: nil, limit: 100)
        @invoices.values.select do |invoice|
          sub = @subscriptions[invoice.external_subscription_id]
          next false unless sub&.external_customer_id == external_customer_id
          next true if since.blank?

          (invoice.due_at || Time.current) >= since
        end.first(limit)
      end

      def capabilities
        Capabilities.new(
          hosted_checkout: true,
          hosted_billing_portal: false,
          credit_card: true,
          boleto: true,
          pix: true,
          trial_periods: true,
          proration_on_upgrade: true,
          proration_on_downgrade: true,
          cancel_at_period_end: true,
          immediate_cancel: true,
          plan_change_mid_cycle: true,
          native_webhooks: false
        )
      end

      def settle_invoice!(external_invoice_id:, payment_method: "pix")
        invoice = fetch_invoice(external_invoice_id: external_invoice_id)
        paid = ValueObjects::RemoteInvoice.new(
          external_invoice_id: invoice.external_invoice_id,
          external_subscription_id: invoice.external_subscription_id,
          status: "paid",
          amount_cents: invoice.amount_cents,
          due_at: invoice.due_at,
          paid_at: Time.current,
          hosted_invoice_url: invoice.hosted_invoice_url,
          payment_method: payment_method
        )
        @invoices[external_invoice_id] = paid

        remote = @subscriptions[invoice.external_subscription_id]
        if remote
          @subscriptions[remote.external_subscription_id] = ValueObjects::RemoteSubscription.new(
            external_subscription_id: remote.external_subscription_id,
            external_customer_id: remote.external_customer_id,
            status: remote.trial_ends_at && remote.trial_ends_at > Time.current ? "trialing" : "active",
            plan_identifier: remote.plan_identifier,
            current_period_start: remote.current_period_start,
            current_period_end: remote.current_period_end,
            trial_ends_at: remote.trial_ends_at,
            cancel_at_period_end: remote.cancel_at_period_end,
            canceled_at: remote.canceled_at,
            latest_invoice_id: paid.external_invoice_id,
            latest_invoice_url: paid.hosted_invoice_url
          )
        end

        paid
      end

      private

      def persist_invoice_for(remote, catalog_ref)
        invoice_id = "fake-inv-#{SecureRandom.hex(6)}"
        invoice = ValueObjects::RemoteInvoice.new(
          external_invoice_id: invoice_id,
          external_subscription_id: remote.external_subscription_id,
          status: "open",
          amount_cents: catalog_ref.amount_cents.to_i,
          due_at: 5.days.from_now,
          hosted_invoice_url: "https://asaas.test/invoices/#{invoice_id}"
        )
        @invoices[invoice_id] = invoice
        @subscriptions[remote.external_subscription_id] = ValueObjects::RemoteSubscription.new(
          external_subscription_id: remote.external_subscription_id,
          external_customer_id: remote.external_customer_id,
          status: remote.status,
          plan_identifier: remote.plan_identifier,
          current_period_start: remote.current_period_start,
          current_period_end: remote.current_period_end,
          trial_ends_at: remote.trial_ends_at,
          cancel_at_period_end: remote.cancel_at_period_end,
          canceled_at: remote.canceled_at,
          latest_invoice_id: invoice_id,
          latest_invoice_url: invoice.hosted_invoice_url
        )
        invoice
      end

      def period_end_for(interval, from)
        interval.to_s == "year" ? from + 1.year : from + 1.month
      end
    end
  end
end
