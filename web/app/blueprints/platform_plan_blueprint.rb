# frozen_string_literal: true

class PlatformPlanBlueprint < Blueprinter::Base
  identifier :id

  fields :key, :name, :monthly_amount_cents, :created_at, :updated_at

  field :intervals do |plan|
    plan.platform_plan_provider_prices.active.order(:provider, :billing_interval).map do |price|
      {
        billing_interval: price.billing_interval,
        amount_cents: price.amount_cents,
        provider: price.provider
      }
    end
  end

  view :school do
    exclude :id
    exclude :monthly_amount_cents
    exclude :created_at
    exclude :updated_at

    field :intervals do |plan|
      Platform::ListSchoolPlatformPlansService.intervals_for(plan)
    end
  end
end
