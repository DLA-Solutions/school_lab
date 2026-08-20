# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::ListSchoolPlatformPlansService do
  let!(:starter) do
    PlatformPlan.find_or_create_by!(key: "starter") do |row|
      row.name = "Starter"
      row.monthly_amount_cents = 29_900
    end
  end
  let!(:pro) do
    PlatformPlan.find_or_create_by!(key: "pro") do |row|
      row.name = "Pro"
      row.monthly_amount_cents = 59_900
    end
  end

  before do
    PlatformBillingSetting.instance.update!(active_provider: "fake")
    [ starter, pro ].each { |plan| ensure_platform_plan_prices(plan) }
  end

  it "returns kept plans ordered by monthly amount" do
    result = described_class.call

    expect(result).to be_success
    expect(result.data.map(&:key)).to include("starter", "pro")
    expect(result.data.map(&:monthly_amount_cents)).to eq(result.data.map(&:monthly_amount_cents).sort)
  end

  it "uses active-provider prices and omits vendor identifiers" do
    starter.platform_plan_provider_prices.find_by!(provider: "fake", billing_interval: "month")
      .update!(amount_cents: 12_345, external_price_id: "asaas_starter_monthly")
    starter.platform_plan_provider_prices.find_by!(provider: "fake", billing_interval: "year")
      .update!(amount_cents: 123_450, external_price_id: "asaas_starter_yearly")

    intervals = described_class.intervals_for(starter.reload)

    expect(intervals).to eq(
      [
        { billing_interval: "month", amount_cents: 12_345 },
        { billing_interval: "year", amount_cents: 123_450 }
      ]
    )
    expect(intervals.flat_map(&:keys)).to eq(%i[billing_interval amount_cents billing_interval amount_cents])
  end

  it "falls back to monthly_amount_cents and 12x year when the provider has no row" do
    starter.platform_plan_provider_prices.where(provider: "fake").delete_all
    starter.reload

    expect(described_class.intervals_for(starter)).to eq(
      [
        { billing_interval: "month", amount_cents: 29_900 },
        { billing_interval: "year", amount_cents: 358_800 }
      ]
    )
  end

  it "falls back for year when only the monthly provider row exists" do
    starter.platform_plan_provider_prices.find_by!(provider: "fake", billing_interval: "year").destroy!
    starter.platform_plan_provider_prices.find_by!(provider: "fake", billing_interval: "month")
      .update!(amount_cents: 10_000)
    starter.reload

    expect(described_class.intervals_for(starter)).to eq(
      [
        { billing_interval: "month", amount_cents: 10_000 },
        { billing_interval: "year", amount_cents: 358_800 }
      ]
    )
  end

  it "ignores inactive provider prices" do
    starter.platform_plan_provider_prices.where(provider: "fake").find_each do |price|
      price.update!(active: false, amount_cents: 1)
    end
    starter.reload

    expect(described_class.intervals_for(starter)).to eq(
      [
        { billing_interval: "month", amount_cents: 29_900 },
        { billing_interval: "year", amount_cents: 358_800 }
      ]
    )
  end
end
