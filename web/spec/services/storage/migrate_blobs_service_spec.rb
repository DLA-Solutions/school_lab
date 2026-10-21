# frozen_string_literal: true

require "rails_helper"

RSpec.describe Storage::MigrateBlobsService do
  subject(:result) { described_class.call(from: "legacy", to: "bucket", dry_run: dry_run) }

  let(:dry_run) { false }
  let(:legacy_dir) { Dir.mktmpdir("legacy-storage") }
  let(:bucket_dir) { Dir.mktmpdir("bucket-storage") }
  let(:registry) do
    ActiveStorage::Service::Registry.new(
      legacy: { service: "Disk", root: legacy_dir },
      bucket: { service: "Disk", root: bucket_dir }
    )
  end

  # Two real Disk services stand in for the volume and the bucket, so no example can reach R2.
  around do |example|
    original = ActiveStorage::Blob.services
    ActiveStorage::Blob.services = registry
    example.run
  ensure
    ActiveStorage::Blob.services = original
    FileUtils.remove_entry(legacy_dir)
    FileUtils.remove_entry(bucket_dir)
  end

  def blob_on(service_name, body: "family document")
    ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(body), filename: "rg.pdf", content_type: "application/pdf", service_name: service_name
    )
  end

  it "copies the bytes under the same key and repoints the blob" do
    blob = blob_on("legacy")

    expect(result).to be_success
    expect(result.data).to include(copied: 1, already_present: 0, missing_blob_ids: [], failed_blob_ids: [])

    blob.reload
    expect(blob.service_name).to eq("bucket")
    expect(blob.download).to eq("family document")
    expect(registry.fetch(:bucket).exist?(blob.key)).to be(true)
  end

  it "leaves the source copy in place for a manual cleanup after verification" do
    blob = blob_on("legacy")

    result

    expect(registry.fetch(:legacy).exist?(blob.key)).to be(true)
  end

  it "leaves blobs on other services alone" do
    other = blob_on("bucket")

    expect(result.data).to include(copied: 0)
    expect(other.reload.service_name).to eq("bucket")
  end

  it "is repeatable: a second run finds nothing left to move" do
    blob_on("legacy")
    described_class.call(from: "legacy", to: "bucket")

    expect(result.data).to include(copied: 0, already_present: 0)
  end

  it "does not upload again a key the target already holds" do
    blob = blob_on("legacy")
    registry.fetch(:bucket).upload(blob.key, StringIO.new("family document"), checksum: blob.checksum)

    expect(result.data).to include(copied: 0, already_present: 1)
    expect(blob.reload.service_name).to eq("bucket")
  end

  it "reports a blob whose source file is gone and keeps it where it was" do
    blob = blob_on("legacy")
    registry.fetch(:legacy).delete(blob.key)

    expect(result).to be_success
    expect(result.data[:missing_blob_ids]).to eq([ blob.id ])
    expect(blob.reload.service_name).to eq("legacy")
  end

  it "reports a corrupted source file instead of copying it" do
    blob = blob_on("legacy")
    File.binwrite(registry.fetch(:legacy).path_for(blob.key), "tampered")

    expect(result.data[:failed_blob_ids]).to eq([ blob.id ])
    expect(blob.reload.service_name).to eq("legacy")
    expect(registry.fetch(:bucket).exist?(blob.key)).to be(false)
  end

  context "when run as a dry run" do
    let(:dry_run) { true }

    it "counts what would move without touching the target or the blob" do
      blob = blob_on("legacy")

      expect(result.data).to include(copied: 1, dry_run: true)
      expect(blob.reload.service_name).to eq("legacy")
      expect(registry.fetch(:bucket).exist?(blob.key)).to be(false)
    end
  end

  it "fails with a stable code for an unknown service" do
    outcome = described_class.call(from: "legacy", to: "nowhere")

    expect(outcome).to be_failure
    expect(outcome.error_code).to eq(:unknown_service)
  end

  it "refuses to move a service onto itself" do
    expect(described_class.call(from: "legacy", to: "legacy").error_code).to eq(:same_service)
  end
end
