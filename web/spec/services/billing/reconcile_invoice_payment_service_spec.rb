# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ReconcileInvoicePaymentService do
  let(:school) { create(:school) }
  let(:adapter) { Gateways::BankSlip::Fake.new(school: school) }
  let(:charge) { create(:charge, :issued, school: school) }
  let(:issuance) { charge.current_issuance }
  let(:webhook_event) do
    create(:webhook_event,
           school: school,
           provider: "fake",
           provider_resource_id: issuance.provider_invoice_id)
  end

  before do
    adapter.seed_open_invoice!(issuance: issuance, charge: charge)
  end

  it "records payment from fetch_invoice when the invoice is paid" do
    paid_at = 2.hours.ago.change(usec: 0)
    adapter.settle_invoice!(
      provider_invoice_id: issuance.provider_invoice_id,
      payment_method: "pix",
      paid_at: paid_at
    )

    result = described_class.call(webhook_event: webhook_event, adapter: adapter)

    expect(result).to be_success
    payment = Payment.find_by(provider_payment_id: "fake-pay-#{issuance.provider_invoice_id}")
    expect(payment).to have_attributes(
      paid_amount_cents: charge.total_amount_cents,
      payment_method: "pix",
      paid_at: paid_at
    )
    expect(charge.reload).to be_paid
    expect(webhook_event.reload).to have_attributes(observed_status: "paid", processed_at: be_present)
  end

  it "does not create a payment when fetch_invoice reports the invoice is still open" do
    result = described_class.call(webhook_event: webhook_event, adapter: adapter)

    expect(result).to be_success
    expect(Payment.count).to eq(0)
    expect(charge.reload.status).to eq("pending")
    expect(webhook_event.reload.observed_status).to eq("open")
  end

  it "transitions overdue charges to paid" do
    charge.mark_overdue!
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id, payment_method: "boleto")

    described_class.call(webhook_event: webhook_event, adapter: adapter)

    expect(charge.reload).to be_paid
    expect(Payment.last.payment_method).to eq("boleto")
  end

  it "is idempotent per webhook event" do
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id)
    described_class.call(webhook_event: webhook_event, adapter: adapter)
    webhook_event.reload

    expect do
      described_class.call(webhook_event: webhook_event, adapter: adapter)
    end.not_to change(Payment, :count)
  end

  it "is idempotent per provider payment id across events" do
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id)
    described_class.call(webhook_event: webhook_event, adapter: adapter)

    second_event = create(:webhook_event,
                          school: school,
                          provider: "fake",
                          provider_event_id: "evt-second",
                          provider_resource_id: issuance.provider_invoice_id)

    expect do
      described_class.call(webhook_event: second_event, adapter: adapter)
    end.not_to change(Payment, :count)
  end

  it "perserves bank-reported fine and interest" do
    adapter.settle_invoice!(
      provider_invoice_id: issuance.provider_invoice_id,
      fine_amount_cents: 500,
      interest_amount_cents: 250
    )

    described_class.call(webhook_event: webhook_event, adapter: adapter)

    payment = Payment.last
    expect(payment.paid_amount_cents).to eq(charge.total_amount_cents + 750)
    expect(payment.fine_amount_cents).to eq(500)
    expect(payment.interest_amount_cents).to eq(250)
  end

  it "records permanent provider errors without retrying" do
    allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::ProviderError, "invalid invoice")

    result = described_class.call(webhook_event: webhook_event, adapter: adapter)

    expect(result).to be_failure
    expect(webhook_event.reload).to have_attributes(
      observed_status: "error",
      processed_at: be_present,
      processing_error: "invalid invoice"
    )
  end

  it "leaves the event unprocessed when fetch_invoice raises TransientError" do
    allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::TransientError, "timeout")

    expect do
      described_class.call(webhook_event: webhook_event, adapter: adapter)
    end.to raise_error(Gateways::BankSlip::TransientError)

    expect(webhook_event.reload.processed_at).to be_nil
  end
end
