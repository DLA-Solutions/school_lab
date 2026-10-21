# frozen_string_literal: true

module Minutes
  # Records that an ata was signed (UC-LA05). Every path that learns of it — the Autentique webhook
  # and the reconcile sweep — goes through here, so the transition and the `MinutesEntrySigned`
  # event happen once, on the move to signed, and a replay of an already-signed ata is a no-op.
  class MarkSignedService < ApplicationService
    def initialize(entry:)
      @entry = entry
    end

    def call
      return ResponseService.success(data: entry) if entry.signed?
      return not_pending unless entry.may_mark_signed?

      ActiveRecord::Base.transaction do
        entry.mark_signed!
        entry.minutes_participants.where(signs: true, signed_at: nil).update_all(signed_at: entry.signed_at)
      end

      on_newly_signed

      ResponseService.success(data: entry)
    end

    private

    attr_reader :entry

    # `MinutesEntrySigned` (PRD § Events): no guardian notification in this slice, so the event is a
    # structured log line and the signed copy is filed. The file's address usually lands a moment
    # after the signature itself and recording it enqueues the same job; this covers the other
    # order, where the address was already known.
    def on_newly_signed
      Rails.logger.info(
        { event: "MinutesEntrySigned", minutes_entry_id: entry.id, school_id: entry.school_id }.to_json
      )

      return if entry.signed_document_url.blank?

      Minutes::AttachSignedPdfJob.perform_later(entry.id, entry.school_id)
    end

    def not_pending
      ResponseService.failure(
        code: :invalid_state_transition,
        details: { base: [ I18n.t("api.errors.minutes_entry_not_pending") ] }
      )
    end
  end
end
