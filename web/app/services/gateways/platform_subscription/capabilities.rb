# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    Capabilities = Data.define(
      :hosted_checkout,
      :hosted_billing_portal,
      :credit_card,
      :boleto,
      :pix,
      :trial_periods,
      :proration_on_upgrade,
      :proration_on_downgrade,
      :cancel_at_period_end,
      :immediate_cancel,
      :plan_change_mid_cycle,
      :native_webhooks
    ) do
      def self.none
        new(
          hosted_checkout: false,
          hosted_billing_portal: false,
          credit_card: false,
          boleto: false,
          pix: false,
          trial_periods: false,
          proration_on_upgrade: false,
          proration_on_downgrade: false,
          cancel_at_period_end: true,
          immediate_cancel: true,
          plan_change_mid_cycle: false,
          native_webhooks: false
        )
      end

      def bank_slip
        boleto
      end
    end
  end
end
