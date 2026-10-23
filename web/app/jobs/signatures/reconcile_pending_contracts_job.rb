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

      unfiled = enqueue_unfiled_signed_contracts

      Rails.logger.info(
        {
          event: "signature.sweep.completed",
          signed: reconciled,
          unfiled_enqueued: unfiled,
          failures: failures
        }.to_json
      )
    end

    private

    # Contracts signed before the signed copy was filed into "Meus documentos" (or whose filing
    # never completed): the provider's file address is on record but no document exists. A
    # discarded document still counts as existing — staff discarding it is a decision, not a gap —
    # so `Document` is not filtered by `kept` here.
    #
    # Deliberately not bounded by LOOKBACK: that window exists to stop re-asking the provider about
    # abandoned, unsigned documents. These are signed, and filing is a one-off per contract that
    # stops being selected as soon as the document exists. The filing itself runs in
    # `Documents::AttachSignedContractJob` so one unreachable file cannot stall the sweep.
    def enqueue_unfiled_signed_contracts
      count = 0

      unfiled_signed_contracts.find_each do |contract|
        ::Documents::AttachSignedContractJob.perform_later(contract.id, contract.school_id)
        count += 1
      end

      count
    end

    def unfiled_signed_contracts
      Contract.kept.signed
              .where.not(signed_document_url: nil)
              .where.not(id: Document.where.not(contract_id: nil).select(:contract_id))
    end

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
