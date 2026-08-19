# frozen_string_literal: true

module Platform
  class ResolveCatalogRefService < ApplicationService
    def initialize(plan:, provider:, billing_interval:)
      @plan = plan
      @provider = provider
      @billing_interval = billing_interval
    end

    def call
      unless PlatformSubscription::INTERVALS.include?(billing_interval.to_s)
        return ResponseService.failure(
          code: :validation_error,
          details: { billing_interval: [ "is not included in the list" ] }
        )
      end

      price = PlatformPlanProviderPrice.active.find_by(
        platform_plan: plan,
        provider: provider,
        billing_interval: billing_interval
      )
      unless price
        return ResponseService.failure(
          code: :validation_error,
          details: { plan_key: [ "has no #{provider} price for #{billing_interval}" ] }
        )
      end

      ResponseService.success(
        data: Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
          plan_key: plan.key,
          billing_interval: billing_interval,
          external_price_id: price.external_price_id,
          amount_cents: price.amount_cents
        )
      )
    end

    private

    attr_reader :plan, :provider, :billing_interval
  end
end
