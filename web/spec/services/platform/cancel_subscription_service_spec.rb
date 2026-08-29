# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::CancelSubscriptionService do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:subscription) do
    create(:platform_subscription, school: school, platform_plan: plan, status: "active", provider: "fake",
                                   collection_method: "send_invoice", external_subscription_id: "fake-sub-1")
  end
  let(:adapter) { Gateways::PlatformSubscription::Fake.new }

  before do
    adapter.instance_variable_set(
      :@subscriptions,
      {
        "fake-sub-1" => Gateways::PlatformSubscription::ValueObjects::RemoteSubscription.new(
          external_subscription_id: "fake-sub-1",
          external_customer_id: "fake-cust",
          status: "active",
          current_period_end: 30.days.from_now
        )
      }
    )
  end

  it "sets cancel_at_period_end and keeps status active" do
    result = described_class.call(
      subscription: subscription,
      at_period_end: true,
      gateway: adapter
    )

    expect(result).to be_success
    expect(result.data.cancel_at_period_end).to eq(true)
    expect(result.data.status).to eq("active")
  end
end
