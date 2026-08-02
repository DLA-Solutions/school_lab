# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ReissueChargeService do
  subject(:result) { described_class.call(charge: charge, adapter: adapter, new_due_date: new_due_date) }

  let(:school) { create(:school) }
  let!(:provider_config) { create(:school_payment_provider, school: school, provider: "fake") }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) { create(:charge, :issued, :overdue, school: school, guardian: guardian) }
  let(:new_due_date) { Date.new(2026, 12, 20) }
  let(:adapter) { instance_double(Gateways::BankSlip::Fake) }
  let(:capabilities) do
    Gateways::BankSlip::Capabilities.new(
      inline_pix: true,
      native_notifications: false,
      cancellation: true,
      fine_and_interest: false,
      past_due_reissue: false
    )
  end
  let(:new_issuance_result) do
    Gateways::BankSlip::ValueObjects::Issuance.new(
      provider_invoice_id: "fake-invoice-reissued",
      boleto_url: "https://fake.test/boleto/new",
      digitable_line: "23793.38128 60000.000003 00000.000402 1 93480000085000",
      barcode: "237939348000008500033812860000000000000000402",
      our_number: "000000402",
      pix_emv: "000201reissued",
      status: "open"
    )
  end

  before do
    allow(adapter).to receive_messages(
      capabilities: capabilities,
      cancel: Gateways::BankSlip::ValueObjects::Issuance.new(
        provider_invoice_id: charge.provider_invoice_id,
        boleto_url: charge.boleto_url,
        digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
        barcode: "23793934800000850003381286000000000000400000",
        our_number: "00000004",
        pix_emv: nil,
        status: "cancelled"
      ),
      issue: new_issuance_result,
      fetch_invoice: Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
        provider_invoice_id: charge.provider_invoice_id,
        status: "cancelled",
        total_amount_cents: charge.total_amount_cents,
        due_date: charge.due_date,
        payments: []
      )
    )
  end

  it "cancels the existing invoice and creates a new issuance" do
    original_invoice_id = charge.current_issuance.provider_invoice_id

    expect(result).to be_success
    expect(adapter).to have_received(:cancel)

    issuances = charge.reload.charge_issuances.order(:created_at)
    expect(issuances.count).to eq(2)
    expect(issuances.first.status).to eq("cancelled")
    expect(issuances.last.status).to eq("issued")
    expect(issuances.last.provider_invoice_id).to eq("fake-invoice-reissued")
    expect(charge.due_date).to eq(new_due_date)
    expect(ChargeIssuance.find_by_provider_invoice_id!(original_invoice_id).charge_id).to eq(charge.id)
  end

  it "returns invalid_state_transition for paid charges" do
    charge.pay!

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
    expect(adapter).not_to have_received(:cancel)
  end

  context "when the charge was never issued" do
    let(:charge) { create(:charge, school: school, guardian: guardian) }

    it "returns invalid_state_transition instead of reaching a provider" do
      outcome = described_class.call(charge: charge, new_due_date: new_due_date)

      expect(outcome).to be_failure
      expect(outcome.error_code).to eq(:invalid_state_transition)
      expect(charge.reload.charge_issuances).to be_empty
    end
  end

  context "when the provider supports due date changes" do
    let(:capabilities) do
      Gateways::BankSlip::Capabilities.new(
        inline_pix: true,
        native_notifications: false,
        cancellation: true,
        fine_and_interest: true,
        past_due_reissue: true
      )
    end

    it "updates the existing invoice without creating a second issuance" do
      expect { result }.not_to change(ChargeIssuance, :count)
      expect(result).to be_success
      expect(charge.reload.due_date).to eq(new_due_date)
      expect(adapter).not_to have_received(:cancel)
      expect(adapter).to have_received(:issue)
    end
  end

  context "when recreation raises a transient error" do
    before do
      allow(adapter).to receive(:issue).and_raise(Gateways::BankSlip::TransientError, "timeout")
    end

    it "leaves a pending issuance for retry" do
      expect { result }.to raise_error(Gateways::BankSlip::TransientError)

      pending_issuance = charge.reload.charge_issuances.order(:created_at).last
      expect(pending_issuance.status).to eq("pending")
    end
  end
end
