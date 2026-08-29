# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::ReconcileBillingEventService do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:subscription) do
    create(:platform_subscription, school: school, platform_plan: plan, provider: "fake",
                                   collection_method: "send_invoice", external_subscription_id: "fake-sub-1",
                                   status: "incomplete")
  end
  let(:adapter) { Gateways::PlatformSubscription::Fake.new }

  it "persists a paid invoice and activates the subscription" do
    session = adapter.create_checkout_session(
      Gateways::PlatformSubscription::ValueObjects::CheckoutRequest.new(
        account: Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
          name: school.name, email: "a@example.com", document_number: school.cnpj
        ),
        catalog_ref: Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
          plan_key: "starter", billing_interval: "month", amount_cents: 29_900
        )
      )
    )
    subscription.update!(external_subscription_id: session.external_subscription_id,
                         external_customer_id: session.external_customer_id)
    adapter.settle_invoice!(external_invoice_id: session.external_invoice_id, payment_method: "pix")

    webhook_event = WebhookEvent.create!(
      provider: "fake",
      provider_event_id: "evt-1",
      event_type: "billing.invoice.paid",
      payload: { external_invoice_id: session.external_invoice_id,
                 external_subscription_id: session.external_subscription_id }.to_json
    )

    result = described_class.call(webhook_event: webhook_event, adapter: adapter)

    expect(result).to be_success
    expect(subscription.reload.status).to eq("active")
    expect(PlatformInvoice.find_by(external_invoice_id: session.external_invoice_id).status).to eq("paid")
    expect(PlatformInvoice.find_by(external_invoice_id: session.external_invoice_id).payment_method).to eq("pix")
  end
end
