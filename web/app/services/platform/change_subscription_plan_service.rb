# frozen_string_literal: true

module Platform
  class ChangeSubscriptionPlanService < ApplicationService
    CHANGEABLE_STATUSES = %w[active trialing past_due].freeze

    def initialize(subscription:, params:, gateway: nil)
      @subscription = subscription
      @params = params.to_h.symbolize_keys
      @gateway = gateway
    end

    def call
      unless CHANGEABLE_STATUSES.include?(subscription.status)
        return ResponseService.failure(code: :invalid_state_transition)
      end

      plan = resolve_plan
      return ResponseService.failure(code: :not_found) unless plan

      interval = params[:billing_interval].presence || subscription.billing_interval || "month"
      unless PlatformSubscription::INTERVALS.include?(interval)
        return ResponseService.failure(
          code: :validation_error,
          details: { billing_interval: [ "must be month or year" ] }
        )
      end

      if subscription.provider == "manual"
        subscription.update!(platform_plan: plan, billing_interval: interval)
        return ResponseService.success(data: subscription.reload)
      end

      price = PlatformPlanProviderPrice.active.find_by(
        platform_plan: plan,
        provider: subscription.provider,
        billing_interval: interval
      )
      return ResponseService.failure(code: :not_found) unless price
      return ResponseService.failure(code: :invalid_state_transition) if subscription.external_subscription_id.blank?

      catalog_ref = Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
        plan_key: plan.key,
        billing_interval: interval,
        external_price_id: price.external_price_id,
        amount_cents: price.amount_cents
      )
      remote = gateway.change_plan(
        external_subscription_id: subscription.external_subscription_id,
        catalog_ref: catalog_ref
      )
      SyncSubscriptionService.call(subscription: subscription, remote: remote, plan: plan, interval: interval)
    rescue Gateways::PlatformSubscription::NotSupportedError => e
      ResponseService.failure(code: e.error_code)
    rescue Gateways::PlatformSubscription::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue Gateways::PlatformSubscription::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :subscription, :params

    def gateway
      @gateway ||= Gateways::PlatformSubscription::Registry.for(subscription.provider)
    end

    def resolve_plan
      return PlatformPlan.kept.find_by(id: params[:platform_plan_id]) if params[:platform_plan_id].present?

      PlatformPlan.kept.find_by(key: params[:plan_key]) if params[:plan_key].present?
    end
  end
end
