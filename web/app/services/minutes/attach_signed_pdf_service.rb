# frozen_string_literal: true

module Minutes
  # Stores the provider's signed PDF as the entry's own copy (`has_one_attached :pdf`, BR-LA06).
  # Safe to call as often as the signature paths happen to: webhook, reconcile sweep and the file's
  # address being recorded all converge here, and only the first call that finds the signed file on
  # record does anything. A signed ata whose copy is already stored, or whose address is not known
  # yet, is a successful no-op — recording the address enqueues this again.
  class AttachSignedPdfService < ApplicationService
    PDF_MAGIC = "%PDF"

    def initialize(entry:)
      @entry = entry
    end

    def call
      return ResponseService.success unless fileable?
      return ResponseService.success(data: entry) if entry.pdf.attached?

      fetched = FetchSignedPdfService.call(entry: entry)
      return ResponseService.failure(code: fetched.error_code, details: fetched.details) if fetched.failure?

      pdf = fetched.data.fetch(:pdf)
      return not_a_pdf unless pdf.to_s.start_with?(PDF_MAGIC)

      entry.pdf.attach(io: StringIO.new(pdf), filename: fetched.data.fetch(:filename),
                       content_type: "application/pdf")

      ResponseService.success(data: entry)
    end

    private

    attr_reader :entry

    def fileable?
      entry.kept? && entry.signed? && entry.signed_document_url.present?
    end

    def not_a_pdf
      Rails.logger.error(
        { event: "minutes.signed_pdf_not_pdf", minutes_entry_id: entry.id, school_id: entry.school_id }.to_json
      )

      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.minutes_signed_pdf_unavailable") ] }
      )
    end
  end
end
