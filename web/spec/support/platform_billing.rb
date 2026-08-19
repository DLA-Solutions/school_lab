# frozen_string_literal: true

module PlatformBillingSpecHelpers
  def ensure_platform_plan_prices(plan)
    %w[manual iugu fake].each do |provider|
      %w[month year].each do |interval|
        suffix = interval == "year" ? "yearly" : "monthly"
        amount = interval == "year" ? plan.monthly_amount_cents * 12 : plan.monthly_amount_cents
        price = PlatformPlanProviderPrice.find_or_initialize_by(
          platform_plan: plan,
          provider: provider,
          billing_interval: interval
        )
        price.external_price_id = "#{plan.key}_#{suffix}"
        price.amount_cents = amount
        price.active = true
        price.save!
      end
    end
  end
end

RSpec.configure do |config|
  config.include PlatformBillingSpecHelpers
end
