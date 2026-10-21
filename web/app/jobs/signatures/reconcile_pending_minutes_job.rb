# frozen_string_literal: true

module Signatures
  # Catches up with Livro Ata entries whose Autentique callback never arrived or was not understood —
  # the minutes counterpart of `ReconcilePendingContractsJob`. Without it a signed ata would sit as
  # "pending signature" until someone noticed.
  class ReconcilePendingMinutesJob < ApplicationJob
    queue_as :default

    # Older than this and nobody is going to sign it; the sweep would just keep re-asking the
    # provider about abandoned documents every morning.
    LOOKBACK = 90.days

    def perform
      signed = 0
      failures = []

      pending_entries.find_each do |entry|
        result = ::Minutes::ReconcileSignatureService.call(entry: entry)

        if result.success?
          signed += 1 if result.data.fetch(:status) == "signed"
        else
          failures << { minutes_entry_id: entry.id, school_id: entry.school_id }
        end
      end

      Rails.logger.info(
        { event: "signature.minutes_sweep.completed", signed: signed, failures: failures }.to_json
      )
    end

    private

    # Either it is waiting on its signers, or it was signed but the signed file's address was never
    # learned (so there is no stored copy to serve).
    def pending_entries
      MinutesEntry.kept
                  .where.not(provider_document_id: nil)
                  .where(signature_requested_at: LOOKBACK.ago..)
                  .where(
                    "status = ? OR (status = ? AND signed_document_url IS NULL)",
                    "pending_signature", "signed"
                  )
    end
  end
end
