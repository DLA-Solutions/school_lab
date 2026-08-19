# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::AnalyticsOverviewService do
  let(:starter) { PlatformPlan.find_or_create_by!(key: "starter") { |plan| plan.assign_attributes(name: "Starter", monthly_amount_cents: 29_900) } }

  it "divides yearly interval amount by 12 for MRR" do
    school = create(:school, onboarding_status: "active")
    ensure_platform_plan_prices(starter)
    create(
      :platform_subscription,
      school: school,
      platform_plan: starter,
      status: "active",
      provider: "iugu",
      billing_interval: "year",
      collection_method: "send_invoice"
    )

    result = described_class.call

    expect(result).to be_success
    expect(result.data.fetch(:mrr_cents)).to eq(29_900)
  end
end
