# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::UpdateSubscriptionService do
  let(:school) { create(:school) }
  let(:starter) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:pro) { PlatformPlan.find_by(key: "pro") || create(:platform_plan, :pro) }

  it "rejects plan changes on an Iugu row" do
    subscription = create(:platform_subscription, school: school, platform_plan: starter, provider: "iugu",
                                                  collection_method: "send_invoice")

    result = described_class.call(subscription: subscription, params: { platform_plan_id: pro.id })

    expect(result.error_code).to eq(:invalid_state_transition)
  end

  it "allows status updates on a manual row" do
    subscription = create(:platform_subscription, school: school, platform_plan: starter, provider: "manual")

    result = described_class.call(subscription: subscription, params: { status: "past_due" })

    expect(result).to be_success
    expect(result.data.status).to eq("past_due")
  end

  it "maps legacy trial status to trialing" do
    subscription = create(:platform_subscription, school: school, platform_plan: starter, provider: "manual")

    result = described_class.call(subscription: subscription, params: { status: "trial" })

    expect(result).to be_success
    expect(result.data.status).to eq("trialing")
  end
end
