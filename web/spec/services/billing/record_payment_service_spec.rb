# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::RecordPaymentService do
  let(:school) { create(:school) }
  let(:charge) { create(:charge, :issued, school: school) }
  let(:remote_payment) do
    Gateways::BankSlip::ValueObjects::RemotePayment.new(
      provider_payment_id: "txn-record-1",
      paid_amount_cents: charge.total_amount_cents,
      paid_at: 1.day.ago.change(usec: 0),
      payment_method: "pix"
    )
  end

  it "creates a payment and marks the charge paid through the service layer" do
    result = described_class.call(charge: charge, remote_payment: remote_payment)

    expect(result).to be_success
    expect(charge.reload).to be_paid
    expect(result.data).to be_a(Payment)
  end

  it "returns the existing payment for duplicate provider payment ids" do
    first_result = described_class.call(charge: charge, remote_payment: remote_payment)
    second_charge = create(:charge, :issued, school: school)

    result = described_class.call(charge: second_charge, remote_payment: remote_payment)

    expect(result).to be_success
    expect(result.data.id).to eq(first_result.data.id)
    expect(Payment.where(provider_payment_id: "txn-record-1").count).to eq(1)
  end
end
