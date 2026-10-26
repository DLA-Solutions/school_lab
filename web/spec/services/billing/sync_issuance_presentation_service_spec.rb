# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::SyncIssuancePresentationService do
  subject(:result) { described_class.call(issuance: issuance, adapter: adapter) }

  let(:school) { create(:school) }
  let(:charge) { create(:charge, school: school) }
  # Inter's issue leaves every presentation field nil; the issuance is `issued` right away.
  let!(:issuance) do
    create(:charge_issuance, :issued, charge: charge, school: school, provider: "inter",
                                      provider_invoice_id: "inter-req-1", boleto_url: nil, digitable_line: nil,
                                      barcode: nil, our_number: nil, pix_emv: nil)
  end
  let(:adapter) { instance_double(Gateways::BankSlip::Inter::Adapter) }
  let(:ready_invoice) do
    Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "open", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date, boleto_url: nil,
      digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
      barcode: "23793934800000850003381286000000000000400000", our_number: "00000004",
      pix_emv: "00020126580014br.gov.bcb.pix0136test"
    )
  end

  before { charge.sync_invoice_cache! }

  it "backfills the issuance and the charge cache once Inter has produced the boleto and Pix" do
    allow(adapter).to receive(:fetch_invoice).with(provider_invoice_id: "inter-req-1").and_return(ready_invoice)

    expect(result).to be_success
    expect(result.data).to eq(:synced)
    expect(issuance.reload).to have_attributes(
      digitable_line: ready_invoice.digitable_line, barcode: ready_invoice.barcode,
      our_number: "00000004", pix_emv: ready_invoice.pix_emv
    )
    expect(charge.reload.pix_copy_paste).to eq(ready_invoice.pix_emv)
  end

  it "fails with presentation_pending while the provider has not produced them yet" do
    pending_invoice = Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "draft", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date
    )
    allow(adapter).to receive(:fetch_invoice).and_return(pending_invoice)

    expect(result).to be_failure
    expect(result.error_code).to eq(:presentation_pending)
    expect(issuance.reload.digitable_line).to be_nil
  end

  it "keeps a partial answer and keeps waiting for the rest" do
    pix_only = Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "open", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date, pix_emv: "00020126pix-only"
    )
    allow(adapter).to receive(:fetch_invoice).and_return(pix_only)

    expect(result.error_code).to eq(:presentation_pending)
    expect(issuance.reload.pix_emv).to eq("00020126pix-only")
  end

  it "does not call the provider when the issuance is already complete" do
    issuance.update!(digitable_line: "123", pix_emv: "pix")
    allow(adapter).to receive(:fetch_invoice)

    expect(result.data).to eq(:synced)
    expect(adapter).not_to have_received(:fetch_invoice)
  end

  it "does nothing for an issuance that is not issued" do
    issuance.cancel!
    allow(adapter).to receive(:fetch_invoice)

    expect(result.data).to eq(:not_applicable)
    expect(adapter).not_to have_received(:fetch_invoice)
  end

  it "never overwrites a field the issuance already has" do
    issuance.update!(our_number: "keep-me")
    allow(adapter).to receive(:fetch_invoice).and_return(ready_invoice)

    result

    expect(issuance.reload.our_number).to eq("keep-me")
  end

  it "lets transient provider errors propagate so the job retries" do
    allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::TransientError, "timeout")

    expect { result }.to raise_error(Gateways::BankSlip::TransientError)
  end

  it "returns provider_error for a permanent provider failure" do
    allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::AuthenticationError, "denied")

    expect(result).to be_failure
    expect(result.error_code).to eq(:provider_error)
  end
end
