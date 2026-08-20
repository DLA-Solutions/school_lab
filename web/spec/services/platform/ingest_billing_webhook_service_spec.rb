# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::IngestBillingWebhookService do
  let(:settings) { PlatformBillingSetting.instance }
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let!(:subscription) do
    create(:platform_subscription, school: school, platform_plan: plan, provider: "asaas",
                                   collection_method: "send_invoice", external_subscription_id: "sub_1")
  end

  let(:event) do
    Gateways::PlatformSubscription::ValueObjects::DomainEvent.new(
      provider: "asaas",
      provider_event_id: "evt_1",
      event_type: "billing.invoice.paid",
      external_subscription_id: "sub_1",
      external_invoice_id: "pay_1",
      payload: { external_invoice_id: "pay_1", external_subscription_id: "sub_1" }.to_json
    )
  end

  it "is idempotent on provider + provider_event_id" do
    first = described_class.call(provider: "asaas", token: settings.webhook_endpoint_token, event: event)
    second = described_class.call(provider: "asaas", token: settings.webhook_endpoint_token, event: event)

    expect(first).to be_success
    expect(second.data).to eq(:duplicate)
    expect(WebhookEvent.where(provider: "asaas", provider_event_id: event.provider_event_id).count).to eq(1)
  end

  it "fills school_id after matching external_subscription_id" do
    result = described_class.call(provider: "asaas", token: settings.webhook_endpoint_token, event: event)

    expect(result.data.school_id).to eq(school.id)
  end

  it "returns not_found for a bad token" do
    result = described_class.call(provider: "asaas", token: "nope", event: event)

    expect(result.error_code).to eq(:not_found)
  end
end
