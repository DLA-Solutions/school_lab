# frozen_string_literal: true

module Minutes
  # Asks the provider what became of an ata and records it — the minutes counterpart of
  # `Contracts::ReconcileSignatureService` (duplicated rather than abstracted: two stable cases do
  # not yet justify a shared base). The webhook says *that* something changed; this says *what*, so a
  # missed or replayed callback converges on the provider's answer. Idempotent.
  class ReconcileSignatureService < ApplicationService
    def initialize(entry:)
      @entry = entry
    end

    def call
      return not_sent if entry.provider_document_id.blank?

      # Signed and the signed file's address is known: nothing left to learn.
      if entry.signed? && entry.signed_document_url.present?
        return ResponseService.success(data: { entry: entry, status: "signed" })
      end

      document = fetch
      return document if document.is_a?(ResponseService)

      if document.status == "signed"
        MarkSignedService.call(entry: entry)
        record_signed_file(document.signed_file_url)
      end

      log(status: document.status)

      ResponseService.success(data: { entry: entry.reload, status: document.status })
    end

    private

    attr_reader :entry

    def fetch
      config = Gateways::Signature::Registry.active_config(school: entry.school)
      adapter = Gateways::Signature::Registry.resolve(school: entry.school, config: config)

      adapter.fetch_document(provider_document_id: entry.provider_document_id)
    rescue Gateways::Signature::Registry::MissingConfigurationError, Gateways::Signature::Error => e
      log_failure(e)
      ResponseService.failure(code: :provider_error, details: { base: [ e.message ] })
    end

    def record_signed_file(url)
      return if url.blank? || entry.signed_document_url == url

      entry.update_column(:signed_document_url, url)

      # Whichever of marking signed and recording the address came first, this is the moment the
      # signed copy can be filed.
      Minutes::AttachSignedPdfJob.perform_later(entry.id, entry.school_id)
    end

    def not_sent
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.minutes_entry_not_pending") ] }
      )
    end

    def log(status:)
      Rails.logger.info(
        {
          event: "signature.minutes_reconciled",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          provider_document_id: entry.provider_document_id,
          status: status
        }.to_json
      )
    end

    def log_failure(error)
      Rails.logger.error(
        {
          event: "signature.minutes_reconcile_failed",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
