# frozen_string_literal: true

require "rails_helper"

RSpec.describe "POST /webhooks/psp", type: :request do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let!(:charge) do
    create(:charge, :issued, school: school, contract: contract, guardian: guardian)
  end

  def post_webhook(payload_hash)
    post "/webhooks/psp",
         params: payload_hash.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
  end

  it "stores webhook event, payment, and marks charge paid" do
    post_webhook(
      provider: Gateways::BankSlip::Fake::PROVIDER,
      event_id: "evt-payment-1",
      event_type: "payment.confirmed",
      provider_invoice_id: charge.provider_invoice_id,
      provider_payment_id: "txn-abc-123",
      paid_amount_cents: charge.total_amount_cents,
      payment_method: "pix",
      paid_at: Time.current.iso8601
    )

    expect(response).to have_http_status(:ok)
    expect(WebhookEvent.find_by(provider: "fake", provider_event_id: "evt-payment-1")).to be_present
    expect(Payment.find_by(provider_payment_id: "txn-abc-123")).to be_present
    expect(charge.reload.status).to eq("paid")
  end

  it "is idempotent for duplicate provider event ids" do
    payload_hash = {
      provider: Gateways::BankSlip::Fake::PROVIDER,
      event_id: "evt-payment-dup",
      event_type: "payment.confirmed",
      provider_invoice_id: charge.provider_invoice_id,
      provider_payment_id: "txn-dup-123",
      paid_amount_cents: charge.total_amount_cents,
      payment_method: "pix",
      paid_at: Time.current.iso8601
    }

    post_webhook(payload_hash)
    expect(response).to have_http_status(:ok)
    post_webhook(payload_hash)
    expect(response).to have_http_status(:ok)
    expect(Payment.where(provider_payment_id: "txn-dup-123").count).to eq(1)
  end
end
