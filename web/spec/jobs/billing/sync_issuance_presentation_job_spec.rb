# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::SyncIssuancePresentationJob, type: :job do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:charge) { create(:charge, school: school) }
  let!(:issuance) do
    create(:charge_issuance, :issued, charge: charge, school: school, provider: "inter",
                                      provider_invoice_id: "inter-req-1", boleto_url: nil, digitable_line: nil,
                                      barcode: nil, our_number: nil, pix_emv: nil)
  end
  let(:adapter) { instance_double(Gateways::BankSlip::Inter::Adapter) }
  let(:ready_invoice) do
    Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "open", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date, digitable_line: "23793.38128", pix_emv: "00020126pix"
    )
  end

  before do
    allow(Gateways::BankSlip::Registry).to receive(:resolve).and_return(adapter)
  end

  it "backfills the issuance when the provider has the boleto ready" do
    allow(adapter).to receive(:fetch_invoice).and_return(ready_invoice)

    described_class.perform_now(issuance.id, school.id)

    expect(issuance.reload).to have_attributes(digitable_line: "23793.38128", pix_emv: "00020126pix")
  end

  it "is idempotent" do
    allow(adapter).to receive(:fetch_invoice).and_return(ready_invoice)

    2.times { described_class.perform_now(issuance.id, school.id) }

    expect(adapter).to have_received(:fetch_invoice).once
  end

  it "reschedules itself while the provider has not produced the boleto yet" do
    pending_invoice = Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "draft", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date
    )
    allow(adapter).to receive(:fetch_invoice).and_return(pending_invoice)

    expect { described_class.perform_now(issuance.id, school.id) }
      .to change { SolidQueue::Job.where(class_name: described_class.name).count }.by(1)
  end

  it "gives up after the bounded number of attempts without raising" do
    pending_invoice = Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-req-1", status: "draft", total_amount_cents: charge.total_amount_cents,
      due_date: charge.due_date
    )
    allow(adapter).to receive(:fetch_invoice).and_return(pending_invoice)
    job = described_class.new(issuance.id, school.id)
    # ActiveJob counts retries per exception list, under this key.
    job.exception_executions["[#{described_class::PresentationPending}]"] = described_class::MAX_ATTEMPTS - 1

    expect { job.perform_now }
      .not_to(change { SolidQueue::Job.where(class_name: described_class.name).count })
  end

  it "retries transient provider failures" do
    allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::TransientError, "timeout")

    expect { described_class.perform_now(issuance.id, school.id) }
      .to change { SolidQueue::Job.where(class_name: described_class.name).count }.by(1)
  end

  it "discards when the issuance does not belong to the given school" do
    allow(adapter).to receive(:fetch_invoice)

    expect { described_class.perform_now(issuance.id, other_school.id) }.not_to raise_error
    expect(adapter).not_to have_received(:fetch_invoice)
  end
end
