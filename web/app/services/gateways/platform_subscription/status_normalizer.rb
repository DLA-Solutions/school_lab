# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module StatusNormalizer
      SUBSCRIPTION_STATUSES = %w[trialing active past_due canceled incomplete].freeze
      INVOICE_STATUSES = %w[draft open paid void uncollectible].freeze
      PAYMENT_METHODS = %w[credit_card bank_slip pix].freeze

      IUGU_SUBSCRIPTION = {
        "active" => "active",
        "suspended" => "canceled",
        "expired" => "canceled"
      }.freeze

      IUGU_INVOICE = {
        "pending" => "open",
        "paid" => "paid",
        "canceled" => "void",
        "cancelled" => "void",
        "expired" => "uncollectible",
        "refunded" => "void",
        "in_protest" => "open",
        "chargeback" => "uncollectible",
        "in_analysis" => "open",
        "externally_paid" => "paid",
        "draft" => "draft"
      }.freeze

      IUGU_PAYMENT_METHOD = {
        "iugu_credit_card" => "credit_card",
        "credit_card" => "credit_card",
        "iugu_bank_slip" => "bank_slip",
        "bank_slip" => "bank_slip",
        "iugu_pix" => "pix",
        "pix" => "pix"
      }.freeze

      module_function

      def subscription(status)
        value = IUGU_SUBSCRIPTION[status.to_s] || status.to_s
        SUBSCRIPTION_STATUSES.include?(value) ? value : "active"
      end

      def invoice(status)
        mapped = IUGU_INVOICE[status.to_s] || status.to_s
        INVOICE_STATUSES.include?(mapped) ? mapped : "open"
      end

      def subscription_status!(status)
        value = status.to_s
        return value if SUBSCRIPTION_STATUSES.include?(value)

        raise ArgumentError, "invalid subscription status: #{status}"
      end

      def invoice_status!(status)
        value = status.to_s
        return value if INVOICE_STATUSES.include?(value)

        raise ArgumentError, "invalid invoice status: #{status}"
      end

      def from_iugu_subscription(payload)
        return "canceled" if truthy?(payload["suspended"]) || payload["expired_at"].present?
        return "trialing" if payload["in_trial"] == true || payload["trial"] == true

        mapped = IUGU_SUBSCRIPTION[payload["status"].to_s]
        return mapped if mapped

        recent = Array(payload["recent_invoices"]).first
        return "past_due" if recent && %w[expired pending].include?(recent["status"].to_s) && overdue?(recent)

        "active"
      end

      def from_iugu_invoice(status)
        IUGU_INVOICE.fetch(status.to_s, "open")
      end

      def from_iugu_payment_method(value)
        return if value.blank?

        IUGU_PAYMENT_METHOD[value.to_s] || value.to_s
      end

      def truthy?(value)
        value == true || value.to_s == "true"
      end

      def overdue?(invoice)
        due = invoice["due_date"]
        return false if due.blank?

        Date.parse(due.to_s) < Date.current
      rescue Date::Error
        false
      end
    end
  end
end
