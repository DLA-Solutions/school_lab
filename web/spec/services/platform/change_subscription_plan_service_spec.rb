# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::ChangeSubscriptionPlanService do
  let(:school) { create(:school) }
  let(:starter) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:pro) { PlatformPlan.find_by(key: "pro") || create(:platform_plan, :pro) }

  it "updates a manual subscription locally" do
    subscription = create(:platform_subscription, school: school, platform_plan: starter, provider: "manual",
                                                  status: "active", billing_interval: "month")

    result = described_class.call(
      subscription: subscription,
      params: { platform_plan_id: pro.id, billing_interval: "year" }
    )

    expect(result).to be_success
    expect(result.data.platform_plan_id).to eq(pro.id)
    expect(result.data.billing_interval).to eq("year")
  end

  it "returns invalid_state_transition when canceled" do
    subscription = create(:platform_subscription, school: school, platform_plan: starter, provider: "manual",
                                                  status: "canceled")

    result = described_class.call(subscription: subscription, params: { plan_key: "pro" })

    expect(result.error_code).to eq(:invalid_state_transition)
  end
end
