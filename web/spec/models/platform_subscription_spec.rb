# frozen_string_literal: true

require "rails_helper"

RSpec.describe PlatformSubscription, type: :model do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }

  it "validates the collection statuses" do
    subscription = build(:platform_subscription, school: school, platform_plan: plan, status: "trialing")
    expect(subscription).to be_valid

    subscription.status = "trial"
    expect(subscription).to be_valid
    expect(subscription.status).to eq("trialing")
  end

  it "includes trialing in billable" do
    create(:platform_subscription, :trialing, school: school, platform_plan: plan)
    expect(described_class.billable.count).to eq(1)
  end
end
