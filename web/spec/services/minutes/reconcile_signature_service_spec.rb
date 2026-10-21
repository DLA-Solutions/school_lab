# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::ReconcileSignatureService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:entry) { create(:minutes_entry, :pending_signature, school: school, provider_document_id: "doc-1") }
  let(:file_url) { "https://autentique.example/doc-1/assinado.pdf" }

  def stub_status(status, signed_file_url: nil)
    document = Gateways::Signature::ValueObjects::RemoteDocument.new(
      provider_document_id: "doc-1", status: status, signed_file_url: signed_file_url
    )
    adapter = instance_double(Gateways::Signature::Fake, fetch_document: document)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
  end

  it "marks the entry signed, records the file address and enqueues filing the copy" do
    stub_status("signed", signed_file_url: file_url)

    result = nil
    expect { result = described_class.call(entry: entry) }
      .to have_enqueued_job(Minutes::AttachSignedPdfJob).with(entry.id, school.id).once

    expect(result.data[:status]).to eq("signed")
    expect(entry.reload).to be_signed
    expect(entry.signed_document_url).to eq(file_url)
  end

  it "leaves a still-pending entry pending" do
    stub_status("pending")

    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(entry.reload).to be_pending_signature
  end

  it "learns the file address of an entry signed earlier" do
    entry.update_columns(status: "signed", signed_at: 1.day.ago)
    stub_status("signed", signed_file_url: file_url)

    expect { described_class.call(entry: entry) }.to have_enqueued_job(Minutes::AttachSignedPdfJob)
    expect(entry.reload.signed_document_url).to eq(file_url)
  end

  it "does nothing more once signed with the address on record" do
    entry.update_columns(status: "signed", signed_at: 1.day.ago, signed_document_url: file_url)
    allow(Gateways::Signature::Registry).to receive(:resolve)

    result = described_class.call(entry: entry)

    expect(result.data[:status]).to eq("signed")
    expect(Gateways::Signature::Registry).not_to have_received(:resolve)
  end

  it "reports a provider failure without changing the entry" do
    adapter = instance_double(Gateways::Signature::Fake)
    allow(adapter).to receive(:fetch_document).and_raise(Gateways::Signature::TransientError, "down")
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

    result = described_class.call(entry: entry)

    expect(result.error_code).to eq(:provider_error)
    expect(entry.reload).to be_pending_signature
  end

  it "refuses an entry that never reached the provider" do
    draft = create(:minutes_entry, school: school)

    expect(described_class.call(entry: draft)).to be_failure
  end
end
