# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::PlatformSubscription::Manual do
  subject(:adapter) { described_class.new }

  it_behaves_like "a platform subscription adapter"

  it "creates a local subscription without HTTP" do
    account = Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
      name: "Escola",
      email: "a@example.com",
      document_number: "123"
    )
    catalog = Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
      plan_key: "starter",
      billing_interval: "month"
    )
    remote = adapter.create_subscription(
      Gateways::PlatformSubscription::ValueObjects::SubscriptionRequest.new(
        account: account,
        catalog_ref: catalog
      )
    )

    expect(remote.status).to eq("active")
    expect(remote.external_subscription_id).to start_with("manual-sub-")
  end

  it "does not host checkout" do
    expect(adapter.capabilities.hosted_checkout).to eq(false)
  end
end
