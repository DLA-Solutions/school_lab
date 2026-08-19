# frozen_string_literal: true

module Platform
  class ListSchoolPlatformPlansService < ApplicationService
    INTERVALS = %w[month year].freeze

    def initialize(scope: PlatformPlan.kept)
      @scope = scope
    end

    def call
      plans = scope.kept.includes(:platform_plan_provider_prices).order(:monthly_amount_cents)
      ResponseService.success(data: plans)
    end

    def self.intervals_for(plan, provider: PlatformBillingSetting.instance.active_provider)
      prices_by_interval = plan.platform_plan_provider_prices
        .select { |price| price.active? && price.provider == provider }
        .index_by(&:billing_interval)

      INTERVALS.map do |interval|
        price = prices_by_interval[interval]
        {
          billing_interval: interval,
          amount_cents: amount_cents_for(plan, interval, price)
        }
      end
    end

    def self.amount_cents_for(plan, interval, price)
      return price.amount_cents if price
      return plan.monthly_amount_cents if interval == "month"

      plan.monthly_amount_cents * 12
    end
    private_class_method :amount_cents_for

    private

    attr_reader :scope
  end
end
