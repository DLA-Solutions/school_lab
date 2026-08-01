# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::CancelChargeService do
  subject(:result) { described_class.call(charge: charge, adapter: adapter) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) { create(:charge, :issued, school: school, guardian: guardian) }
  let(:adapter) { instance_double(Gateways::BankSlip::Fake) }
  let(:capabilities) { Gateways::BankSlip::Capabilities.full }

  before do
    allow(adapter).to receive_messages(cancel: cancelled_issuance, capabilities: capabilities)
  end

  def cancelled_issuance
    Gateways::BankSlip::ValueObjects::Issuance.new(
      provider_invoice_id: charge.provider_invoice_id,
      boleto_url: charge.boleto_url,
      digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
      barcode: "23793934800000850003381286000000000000400000",
      our_number: "00000004",
      pix_emv: nil,
      status: "cancelled"
    )
  end

  it "cancels the remote invoice and the charge" do
    invoice_id = charge.current_issuance.provider_invoice_id

    expect(result).to be_success

    expect(adapter).to have_received(:cancel).with(provider_invoice_id: invoice_id)
    expect(charge.reload.status).to eq("cancelled")
    issuance = charge.charge_issuances.find_by!(provider_invoice_id: invoice_id)
    expect(issuance.status).to eq("cancelled")
    expect(issuance.cancelled_at).to be_present
  end

  it "cancels locally when there is no issuance" do
    charge.charge_issuances.destroy_all
    charge.clear_invoice_cache!

    expect(result).to be_success
    expect(adapter).not_to have_received(:cancel)
    expect(charge.reload.status).to eq("cancelled")
  end

  it "returns invalid_state_transition for paid charges" do
    charge.pay!

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
    expect(adapter).not_to have_received(:cancel)
  end

  it "returns failure when the provider rejects cancellation" do
    allow(adapter).to receive(:cancel).and_raise(Gateways::BankSlip::ProviderError, "invoice already settled")

    expect(result).to be_failure
    expect(result.error_code).to eq(:provider_rejected)
    expect(charge.reload.status).to eq("pending")
  end

  it "returns failure on transient provider errors without cancelling locally" do
    allow(adapter).to receive(:cancel).and_raise(Gateways::BankSlip::TransientError, "timeout")

    expect(result).to be_failure
    expect(result.error_code).to eq(:provider_unavailable)
    expect(charge.reload.status).to eq("pending")
  end

  context "when the provider does not support cancellation" do
    let(:capabilities) do
      Gateways::BankSlip::Capabilities.new(
        inline_pix: true,
        native_notifications: false,
        cancellation: false,
        fine_and_interest: true,
        past_due_reissue: true
      )
    end

    it "still cancels the charge locally and records the limitation" do
      expect(result).to be_success
      expect(adapter).not_to have_received(:cancel)
      expect(charge.reload.status).to eq("cancelled")
      expect(charge.current_issuance.last_error).to include("remote cancellation unsupported")
    end
  end
end

RSpec.describe Billing::DiscardChargeService do
  subject(:result) { described_class.call(charge: charge, actor: actor, adapter: adapter) }

  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) { create(:charge, :issued, school: school, guardian: guardian) }
  let(:adapter) { instance_double(Gateways::BankSlip::Fake) }

  before do
    allow(adapter).to receive_messages(
      cancel: Gateways::BankSlip::ValueObjects::Issuance.new(
        provider_invoice_id: charge.provider_invoice_id,
        boleto_url: charge.boleto_url,
        digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
        barcode: "23793934800000850003381286000000000000400000",
        our_number: "00000004",
        pix_emv: nil,
        status: "cancelled"
      ),
      capabilities: Gateways::BankSlip::Capabilities.full
    )
  end

  it "cancels the remote invoice before discarding the charge" do
    expect(result).to be_success

    expect(adapter).to have_received(:cancel)
    expect(charge.reload).to be_discarded
    expect(charge.discarded_by_id).to eq(actor.id)
  end
end
