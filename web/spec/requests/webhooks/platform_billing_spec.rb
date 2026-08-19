# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Webhooks::PlatformBilling", type: :request do
  let(:settings) { PlatformBillingSetting.instance }
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }

  before do
    create(:platform_subscription, school: school, platform_plan: plan, provider: "iugu",
                                   collection_method: "send_invoice", external_subscription_id: "SUB1")
  end

  it "accepts an Iugu invoice event and is idempotent" do
    payload = {
      event: "invoice.status_changed",
      data: { id: "INV1", status: "paid", subscription_id: "SUB1" }
    }

    post "/webhooks/platform_billing/iugu/#{settings.webhook_endpoint_token}",
         params: payload.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:accepted)

    post "/webhooks/platform_billing/iugu/#{settings.webhook_endpoint_token}",
         params: payload.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:ok)
    expect(WebhookEvent.where(provider: "iugu").count).to eq(1)
  end

  it "does not use the Cora webhook ingress" do
    post "/webhooks/iugu/#{settings.webhook_endpoint_token}",
         params: { event: "invoice.status_changed" }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }

    expect(response).to have_http_status(:not_found)
  end

  it "returns 404 for an unknown token" do
    post "/webhooks/platform_billing/iugu/not-the-token",
         params: {
           event: "invoice.created",
           data: { id: "INV9", subscription_id: "SUB1" }
         }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }

    expect(response).to have_http_status(:not_found)
  end
end
