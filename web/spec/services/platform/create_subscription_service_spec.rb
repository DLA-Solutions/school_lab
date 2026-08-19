# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::CreateSubscriptionService do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }

  it "defaults provider to manual and never needs IUGU env" do
    expect(ENV["IUGU_API_TOKEN"]).to be_blank

    result = described_class.call(params: { school_id: school.id, platform_plan_id: plan.id })

    expect(result).to be_success
    expect(result.data.provider).to eq("manual")
    expect(result.data.status).to eq("active")
    expect(result.data.billing_interval).to eq("month")
    expect(result.data.collection_method).to eq("manual")
  end

  it "creates trialing when trial is true" do
    result = described_class.call(
      params: { school_id: school.id, platform_plan_id: plan.id, trial: true }
    )

    expect(result.data.status).to eq("trialing")
    expect(result.data.trial_ends_at).to be_within(1.minute).of(14.days.from_now)
  end

  it "returns subscription_exists for a second non-canceled row" do
    described_class.call(params: { school_id: school.id, platform_plan_id: plan.id })
    result = described_class.call(params: { school_id: school.id, platform_plan_id: plan.id })

    expect(result).to be_failure
    expect(result.error_code).to eq(:subscription_exists)
  end
end
