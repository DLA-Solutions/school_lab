# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module StatusNormalizer
      SUBSCRIPTION_STATUSES = %w[trialing active past_due canceled incomplete].freeze
      INVOICE_STATUSES = %w[draft open paid void uncollectible].freeze
      PAYMENT_METHODS = %w[credit_card bank_slip pix].freeze

      ASAAS_SUBSCRIPTION = {
        "ACTIVE" => "active",
        "INACTIVE" => "past_due",
        "EXPIRED" => "canceled"
      }.freeze

      ASAAS_INVOICE = {
        "PENDING" => "open",
        "RECEIVED" => "paid",
        "CONFIRMED" => "paid",
        "RECEIVED_IN_CASH" => "paid",
        "OVERDUE" => "open",
        "REFUNDED" => "void",
        "DELETED" => "void"
      }.freeze

      ASAAS_PAYMENT_METHOD = {
        "CREDIT_CARD" => "credit_card",
        "BOLETO" => "bank_slip",
        "PIX" => "pix",
        "UNDEFINED" => nil
      }.freeze

      module_function

      def subscription(status)
        value = ASAAS_SUBSCRIPTION[status.to_s] || status.to_s
        SUBSCRIPTION_STATUSES.include?(value) ? value : "active"
      end

      def invoice(status)
        mapped = ASAAS_INVOICE[status.to_s] || status.to_s
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

      def from_asaas_subscription(payload, payment: nil)
        return "canceled" if payload["deleted"] == true || payload["status"] == "EXPIRED"
        return "past_due" if payment&.dig("status") == "OVERDUE" || payload["status"] == "INACTIVE"
        return "trialing" if payload["nextDueDate"].present? && Date.parse(payload["nextDueDate"].to_s) > Date.current

        ASAAS_SUBSCRIPTION.fetch(payload["status"].to_s, "active")
      rescue Date::Error
        "active"
      end

      def from_asaas_invoice(status)
        ASAAS_INVOICE.fetch(status.to_s, "open")
      end

      def from_asaas_payment_method(value)
        return if value.blank?

        ASAAS_PAYMENT_METHOD[value.to_s] || value.to_s.downcase
      end
    end
  end
end
