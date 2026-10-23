# frozen_string_literal: true

require "rails_helper"

RSpec.describe Documents::DiscardDocumentService do
  subject(:result) { described_class.call(document: document, actor: actor) }

  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:student) { create(:student, school: school) }
  let!(:document) { create(:document, :approved, school: school, documentable: student) }

  it "inactivates the document and records who did it" do
    expect(result).to be_success
    expect(document.reload).to be_discarded
    expect(document.discarded_by).to eq(actor)
  end

  it "never removes the row or the stored file" do
    blob = document.file.blob
    blob_id = blob.id

    expect { result }.not_to change { [ Document.unscoped.count, ActiveStorage::Attachment.count, ActiveStorage::Blob.count ] }

    expect(Document.unscoped.find(document.id).file).to be_attached
    expect(ActiveStorage::Blob.find(blob_id).service.exist?(blob.key)).to be(true)
  end

  it "does not enqueue any purge of the blob" do
    expect { result }.not_to have_enqueued_job(ActiveStorage::PurgeJob)
  end

  it "is audited with the discard fields" do
    Audited.audit_class.as_user(actor) { result }

    audit = document.audits.where(action: "update").order(:id).last(2).find { |a| a.audited_changes.key?("discarded_at") }
    expect(audit).to be_present
    expect(audit.user).to eq(actor)
    expect(document.audits.where(action: "update").flat_map { |a| a.audited_changes.keys }).to include("discarded_by_id")
  end

  context "when it is already inactive" do
    before { document.discard }

    it "fails with invalid_state_transition" do
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
