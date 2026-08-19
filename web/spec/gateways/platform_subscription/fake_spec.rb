# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::PlatformSubscription::Fake do
  let(:adapter) { described_class.new }

  it_behaves_like "a platform subscription adapter"

  let(:account) do
    Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
      name: "Escola",
      email: "dir@example.com",
      document_number: "00000000000100"
    )
  end
  let(:catalog) do
    Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
      plan_key: "starter",
      billing_interval: "month",
      external_price_id: "starter_monthly",
      amount_cents: 29_900
    )
  end

  it "implements hosted checkout" do
    session = adapter.create_checkout_session(
      Gateways::PlatformSubscription::ValueObjects::CheckoutSessionRequest.new(
        account: account,
        catalog_ref: catalog
      )
    )

    expect(session.checkout_url).to be_present
    expect(adapter.capabilities.hosted_checkout).to be true
    expect(adapter.capabilities.hosted_billing_portal).to be false
  end
end
