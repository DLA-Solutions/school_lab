# frozen_string_literal: true

require "rails_helper"

RSpec.describe Signatures::ReconcilePendingMinutesJob do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }

  def stub_status(status)
    document = Gateways::Signature::ValueObjects::RemoteDocument.new(
      provider_document_id: "doc-1", status: status
    )
    adapter = instance_double(Gateways::Signature::Fake, fetch_document: document)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
  end

  it "marks an entry the provider already considers signed" do
    entry = create(:minutes_entry, :pending_signature, school: school, provider_document_id: "doc-1")
    stub_status("signed")

    described_class.perform_now

    expect(entry.reload).to be_signed
  end

  it "leaves still-pending entries alone" do
    entry = create(:minutes_entry, :pending_signature, school: school, provider_document_id: "doc-1")
    stub_status("pending")

    described_class.perform_now

    expect(entry.reload).to be_pending_signature
  end

  it "skips drafts, cancelled entries and abandoned ones" do
    create(:minutes_entry, school: school)
    create(:minutes_entry, :cancelled, school: school, provider_document_id: "doc-1")
    create(:minutes_entry, :pending_signature, school: school, provider_document_id: "doc-1")
      .update_column(:signature_requested_at, 120.days.ago)
    allow(Gateways::Signature::Registry).to receive(:resolve)

    described_class.perform_now

    expect(Gateways::Signature::Registry).not_to have_received(:resolve)
  end

  it "keeps sweeping when one entry fails" do
    broken = create(:minutes_entry, :pending_signature, school: school, provider_document_id: "doc-1")
    adapter = instance_double(Gateways::Signature::Fake)
    allow(adapter).to receive(:fetch_document).and_raise(Gateways::Signature::TransientError, "down")
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

    expect { described_class.perform_now }.not_to raise_error
    expect(broken.reload).to be_pending_signature
  end
end
