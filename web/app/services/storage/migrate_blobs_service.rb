# frozen_string_literal: true

module Storage
  # Moves Active Storage blobs from one configured service to another — the one-off that carries
  # the files written to the Kamal volume (`local`) into the private Cloudflare R2 bucket (`r2`).
  #
  # Every blob remembers the service it was written to (`service_name`), so switching
  # `config.active_storage.service` only affects new uploads and old files keep being read from
  # the volume. This service copies the bytes under the same key, then points the blob at the new
  # service, one blob at a time: a file is readable throughout and a failed run can be repeated.
  # The source copy is left in place; deleting it is a manual step after verification.
  #
  # Idempotent — blobs already pointing at `to` are not selected, and a key that already exists in
  # the target is not uploaded again. Per-blob problems are counted and reported instead of
  # stopping the batch.
  class MigrateBlobsService < ApplicationService
    def initialize(from:, to:, dry_run: false, services: ActiveStorage::Blob.services)
      @from = from.to_s
      @to = to.to_s
      @dry_run = dry_run
      @services = services
    end

    def call
      return ResponseService.failure(code: :same_service) if from == to

      source = services.fetch(from)
      target = services.fetch(to)
      report = { copied: 0, already_present: 0, missing_blob_ids: [], failed_blob_ids: [] }

      ActiveStorage::Blob.where(service_name: from).find_each do |blob|
        record(report, blob, migrate(blob, source, target))
      end

      ResponseService.success(data: report.merge(dry_run: dry_run))
    rescue KeyError
      ResponseService.failure(code: :unknown_service)
    end

    private

    attr_reader :from, :to, :dry_run, :services

    def migrate(blob, source, target)
      outcome = target.exist?(blob.key) ? :already_present : :copied
      copy(blob, source, target) if outcome == :copied && !dry_run
      blob.update_columns(service_name: to) unless dry_run
      outcome
    rescue ActiveStorage::FileNotFoundError
      :missing
    rescue StandardError => e
      Rails.logger.error("[storage:migrate] blob=#{blob.id} #{e.class}")
      :failed
    end

    def copy(blob, source, target)
      source.open(blob.key, checksum: blob.checksum, verify: true) do |file|
        target.upload(blob.key, file, checksum: blob.checksum, filename: blob.filename,
                                      content_type: blob.content_type)
      end
    end

    def record(report, blob, outcome)
      case outcome
      when :missing then report[:missing_blob_ids] << blob.id
      when :failed then report[:failed_blob_ids] << blob.id
      else report[outcome] += 1
      end
    end
  end
end
