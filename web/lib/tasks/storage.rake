# frozen_string_literal: true

namespace :storage do
  desc "Copy blobs between Active Storage services and repoint them (FROM=local TO=r2 DRY_RUN=true)"
  task migrate_blobs: :environment do
    result = Storage::MigrateBlobsService.call(
      from: ENV.fetch("FROM", "local"),
      to: ENV.fetch("TO", "r2"),
      dry_run: ENV["DRY_RUN"] == "true"
    )
    abort "storage:migrate_blobs failed: #{result.error_code}" if result.failure?

    report = result.data
    puts "#{report[:dry_run] ? 'DRY RUN - ' : ''}copied=#{report[:copied]} " \
         "already_present=#{report[:already_present]} missing=#{report[:missing_blob_ids].size} " \
         "failed=#{report[:failed_blob_ids].size}"
    puts "missing source file, blob ids: #{report[:missing_blob_ids].join(', ')}" if report[:missing_blob_ids].any?
    abort "failed blob ids: #{report[:failed_blob_ids].join(', ')}" if report[:failed_blob_ids].any?
  end
end
