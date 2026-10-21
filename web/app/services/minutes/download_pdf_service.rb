# frozen_string_literal: true

module Minutes
  # The PDF behind `GET /minutes_entries/:id/pdf` (UC-LA04/UC-LA05): the signed copy once the ata is
  # signed, otherwise a fresh render — the preview of what goes (or went) out for signature.
  #
  # A signed ata whose copy has not been stored yet is filed on the spot rather than refused, so the
  # school is never told "not available" for a document the provider already holds.
  class DownloadPdfService < ApplicationService
    def initialize(entry:)
      @entry = entry
    end

    def call
      return preview unless entry.signed?

      signed_copy
    end

    private

    attr_reader :entry

    def preview
      rendered = RenderPdfService.call(entry: entry)
      return rendered if rendered.failure?

      ResponseService.success(
        data: { pdf: rendered.data.fetch(:pdf), filename: rendered.data.fetch(:filename), signed: false }
      )
    end

    def signed_copy
      unless entry.pdf.attached?
        attached = fetch_signed_copy
        return attached if attached.failure?
      end

      ResponseService.success(
        data: { pdf: entry.pdf.download, filename: entry.pdf.filename.to_s, signed: true }
      )
    end

    def fetch_signed_copy
      return missing if entry.signed_document_url.blank?

      AttachSignedPdfService.call(entry: entry).then do |result|
        next result if result.failure?
        next missing unless entry.pdf.attached?

        result
      end
    end

    def missing
      ResponseService.failure(
        code: :not_found,
        details: { base: [ I18n.t("api.errors.signed_document_missing") ] }
      )
    end
  end
end
