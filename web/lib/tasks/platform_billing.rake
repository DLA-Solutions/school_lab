# frozen_string_literal: true

namespace :platform_billing do
  desc "Print Iugu plan identifiers that must exist in the Iugu dashboard (ops seed, not request path)"
  task iugu_plan_identifiers: :environment do
    prices = PlatformPlanProviderPrice.active.where(provider: "iugu").includes(:platform_plan)
    prices.each do |price|
      puts "#{price.platform_plan.key} #{price.billing_interval} -> #{price.external_price_id} (#{price.amount_cents} cents)"
    end
  end
end
