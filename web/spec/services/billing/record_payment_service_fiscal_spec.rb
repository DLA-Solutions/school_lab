# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::RecordPaymentService do
  subject(:result) { described_class.call(charge: charge, remote_payment: remote_payment) }

  let(:school) { create(:school) }
  let(:charge) { create(:charge, :issued, school: school) }
  let(:remote_payment) do
    Gateways::BankSlip::ValueObjects::RemotePayment.new(
      provider_payment_id: "pay-remote-1",
      paid_amount_cents: charge.total_amount_cents,
      paid_at: Time.current,
      payment_method: "pix"
    )
  end

  it "records payment and marks charge paid" do
    expect { result }.to change(Payment, :count).by(1)
    expect(result).to be_success
    expect(charge.reload).to be_paid
  end

  context "when fiscal settings are enabled" do
    before do
      create(:school_fiscal_setting, :enabled, school: school)
    end

    it "enqueues IssueServiceInvoiceJob" do
      expect { result }.to have_enqueued_job(Billing::IssueServiceInvoiceJob)
    end
  end

  context "when fiscal settings are disabled" do
    it "does not enqueue IssueServiceInvoiceJob" do
      expect { result }.not_to have_enqueued_job(Billing::IssueServiceInvoiceJob)
    end
  end
end
