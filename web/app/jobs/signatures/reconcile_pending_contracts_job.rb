# frozen_string_literal: true

module Signatures
  # Catches up with contracts whose callback never arrived, or arrived and was not understood.
  #
  # A webhook is a best effort: it can be misconfigured, blocked, or delivered while we are down.
  # Without this sweep a signed contract sits as "aguardando assinatura" until someone notices by
  # hand — which is exactly how the first one was found.
  class ReconcilePendingContractsJob < ApplicationJob
    queue_as :billing

    # Older than this and nobody is going to sign it today; the sweep would just be re-asking the
    # provider about abandoned documents every morning.
    LOOKBACK = 90.days

    def perform
      reconciled = 0
      failures = []

      pending_contracts.find_each do |contract|
        result = ::Contracts::ReconcileSignatureService.call(contract: contract)

        if result.success?
          reconciled += 1 if result.data.fetch(:status) == "signed"
        else
          failures << { contract_id: contract.id, school_id: contract.school_id }
        end
      end

      Rails.logger.info(
        {
          event: "signature.sweep.completed",
          signed: reconciled,
          failures: failures
        }.to_json
      )
    end

    private

    # What was actually handed to a provider and still has something to learn: either it is
    # waiting on the family, or it was signed before we started recording where the signed file
    # lives and the listing has nothing to link to.
    def pending_contracts
      Contract.kept
              .where.not(provider_document_id: nil)
              .where(sent_at: LOOKBACK.ago..)
              .where(
                "signature_status = ? OR (signature_status = ? AND signed_document_url IS NULL)",
                "pending_signature", "signed"
              )
    end
  end
end
