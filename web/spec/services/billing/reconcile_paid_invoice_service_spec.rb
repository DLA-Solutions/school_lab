# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ReconcilePaidInvoiceService do
  let(:school) { create(:school) }
  let(:remote_payment) do
    Gateways::BankSlip::ValueObjects::RemotePayment.new(
      provider_payment_id: "txn-reconcile-1",
      paid_amount_cents: charge.total_amount_cents,
      paid_at: 1.day.ago.change(usec: 0),
      payment_method: "boleto"
    )
  end
  let(:invoice) do
    Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inv-reconcile-1",
      status: "paid",
      total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date,
      payments: [ remote_payment ]
    )
  end

  context "when the charge is open" do
    let(:charge) { create(:charge, :issued, school: school) }

    it "records the payment and marks the charge paid" do
      result = described_class.call(charge: charge, invoice: invoice)

      expect(result).to be_success
      expect(charge.reload).to be_paid
      expect(Payment.where(provider_payment_id: "txn-reconcile-1").count).to eq(1)
    end
  end

  context "when the charge cannot transition to paid" do
    let(:charge) { create(:charge, :cancelled, school: school) }

    it "aborts without persisting a payment" do
      result = nil

      expect do
        result = described_class.call(charge: charge, invoice: invoice)
      end.not_to change(Payment, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
      expect(charge.reload.status).to eq("cancelled")
    end
  end
end
