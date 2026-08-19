# frozen_string_literal: true

RSpec.shared_examples "a platform subscription adapter" do
  let(:account) do
    Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
      name: "Escola Exemplo",
      email: "diretor@example.com",
      document_number: "12345678000190"
    )
  end

  let(:catalog_ref) do
    Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
      plan_key: "starter",
      billing_interval: "month",
      external_price_id: "starter_monthly",
      amount_cents: 29_900
    )
  end

  it "implements the port operations" do
    expect(adapter).to respond_to(
      :create_billing_account,
      :update_billing_account,
      :create_checkout_session,
      :create_billing_portal_session,
      :create_subscription,
      :fetch_subscription,
      :change_plan,
      :cancel_subscription,
      :fetch_invoice,
      :list_invoices,
      :capabilities
    )
  end

  it "returns Capabilities from capabilities" do
    caps = adapter.capabilities

    expect(caps).to be_a(Gateways::PlatformSubscription::Capabilities)
    expect(caps.hosted_checkout).to be_in([ true, false ])
    expect(caps.hosted_billing_portal).to eq(false)
  end

  it "raises NotSupportedError from create_billing_portal_session" do
    expect do
      adapter.create_billing_portal_session(external_customer_id: "cust-1")
    end.to raise_error(Gateways::PlatformSubscription::NotSupportedError)
  end
end
