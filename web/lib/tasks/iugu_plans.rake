# frozen_string_literal: true

namespace :iugu do
  desc "Create or update Iugu plans from platform_plan_provider_prices (ops only — not a request path)"
  task sync_plans: :environment do
    client = SchoolLab::Integrations::Iugu::Client.new
    prices = PlatformPlanProviderPrice.active.where(provider: "iugu").includes(:platform_plan)

    prices.find_each do |price|
      identifier = price.external_price_id
      if identifier.blank?
        warn "Skipping price #{price.id}: missing external_price_id"
        next
      end

      interval = price.billing_interval == "year" ? 12 : 1
      payload = {
        "name" => "#{price.platform_plan.name} (#{price.billing_interval})",
        "identifier" => identifier,
        "interval" => interval,
        "interval_type" => "months",
        "value_cents" => price.amount_cents,
        "payable_with" => %w[credit_card bank_slip pix]
      }

      begin
        client.fetch_plan(identifier)
        puts "Exists: #{identifier}"
      rescue SchoolLab::Integrations::Iugu::ValidationError, SchoolLab::Integrations::Iugu::UnexpectedResponseError
        client.create_plan(payload)
        puts "Created: #{identifier}"
      end
    end
  end
end
