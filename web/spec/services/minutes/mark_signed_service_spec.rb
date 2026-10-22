# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::MarkSignedService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:entry) { create(:minutes_entry, :pending_signature, school: school) }

  it "signs a pending entry and stamps its signers" do
    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(entry.reload).to be_signed
    expect(entry.signed_at).to be_present
    expect(entry.minutes_participants.where(signs: true).pluck(:signed_at)).to all(be_present)
  end

  it "files the signed copy right away when the address is already known" do
    entry.update_column(:signed_document_url, "https://autentique.example/doc.pdf")

    expect { described_class.call(entry: entry) }
      .to have_enqueued_job(Minutes::AttachSignedPdfJob).with(entry.id, school.id)
  end

  it "does not enqueue the filing job while the address is unknown" do
    expect { described_class.call(entry: entry) }.not_to have_enqueued_job(Minutes::AttachSignedPdfJob)
  end

  it "is idempotent and keeps the original signature date" do
    described_class.call(entry: entry)
    original = entry.reload.signed_at

    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(entry.reload.signed_at).to eq(original)
  end

  it "refuses a draft or a cancelled entry" do
    expect(described_class.call(entry: create(:minutes_entry, school: school)).error_code)
      .to eq(:invalid_state_transition)
    expect(described_class.call(entry: create(:minutes_entry, :cancelled, school: school)).error_code)
      .to eq(:invalid_state_transition)
  end
end
