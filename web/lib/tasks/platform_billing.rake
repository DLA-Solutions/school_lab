# frozen_string_literal: true

namespace :platform_billing do
  desc "Print Asaas externalReference identifiers that must exist when syncing subscriptions (ops seed, not request path)"
  task asaas_plan_identifiers: :environment do
    prices = PlatformPlanProviderPrice.active.where(provider: "asaas").includes(:platform_plan)
    prices.each do |price|
      puts "#{price.platform_plan.key} #{price.billing_interval} -> #{price.external_price_id} (#{price.amount_cents} cents)"
    end
  end
end
