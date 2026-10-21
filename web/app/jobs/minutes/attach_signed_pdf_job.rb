# frozen_string_literal: true

module Minutes
  # Downloads the signed ata from the provider and stores it on the entry. Enqueued when the ata is
  # marked signed and again when the signed file's address is recorded, whichever happens second —
  # the service no-ops until both are true and once the copy exists, so extra enqueues cost nothing.
  class AttachSignedPdfJob < ApplicationJob
    queue_as :default

    # The provider's file was not served (timeout, 5xx, token problem). Worth retrying; the daily
    # sweep is the backstop after the attempts run out.
    class ProviderUnavailable < StandardError; end

    MAX_ATTEMPTS = 5

    discard_on ActiveRecord::RecordNotFound
    retry_on ProviderUnavailable, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    def perform(entry_id, school_id)
      school = School.kept.find(school_id)
      entry = school.minutes_entries.kept.find(entry_id)

      result = Minutes::AttachSignedPdfService.call(entry: entry)
      return if result.success?

      raise ProviderUnavailable, "minutes entry #{entry.id}: #{result.error_code}" if result.error_code == :provider_error

      Rails.logger.warn(
        {
          event: "minutes.signed_pdf_attach_failed",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          error_code: result.error_code
        }.to_json
      )
    end
  end
end
