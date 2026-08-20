# frozen_string_literal: true

namespace :asaas do
  desc "Print Asaas externalReference identifiers from platform_plan_provider_prices (ops only)"
  task plan_identifiers: :environment do
    prices = PlatformPlanProviderPrice.active.where(provider: "asaas").includes(:platform_plan)
    prices.each do |price|
      puts "#{price.platform_plan.key} #{price.billing_interval} -> #{price.external_price_id} (#{price.amount_cents} cents)"
    end
  end
end
