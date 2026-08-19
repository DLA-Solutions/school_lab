# frozen_string_literal: true

module Platform
  class CancelSubscriptionService < ApplicationService
    CANCELLABLE_STATUSES = %w[active trialing past_due incomplete].freeze

    def initialize(subscription:, at_period_end: true, gateway: nil)
      @subscription = subscription
      @at_period_end = ActiveModel::Type::Boolean.new.cast(at_period_end)
      @at_period_end = true if at_period_end.nil?
      @gateway = gateway
    end

    def call
      unless CANCELLABLE_STATUSES.include?(subscription.status)
        return ResponseService.failure(code: :invalid_state_transition)
      end

      if subscription.provider == "manual" || subscription.external_subscription_id.blank?
        apply_local_cancel!
        return ResponseService.success(data: subscription.reload)
      end

      remote = gateway.cancel_subscription(
        external_subscription_id: subscription.external_subscription_id,
        at_period_end: at_period_end
      )
      SyncSubscriptionService.call(subscription: subscription, remote: remote)
    rescue Gateways::PlatformSubscription::NotSupportedError => e
      ResponseService.failure(code: e.error_code)
    rescue Gateways::PlatformSubscription::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue Gateways::PlatformSubscription::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :subscription, :at_period_end

    def gateway
      @gateway ||= Gateways::PlatformSubscription::Registry.for(subscription.provider)
    end

    def apply_local_cancel!
      if at_period_end
        subscription.update!(cancel_at_period_end: true)
      else
        subscription.update!(
          status: "canceled",
          cancel_at_period_end: false,
          canceled_at: Time.current
        )
      end
    end
  end
end
