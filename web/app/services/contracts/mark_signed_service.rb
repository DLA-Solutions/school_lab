# frozen_string_literal: true

module Contracts
  # Records that a contract was signed and may kick off guardian access provisioning.
  #
  # Every path that marks a contract signed — Autentique webhook, reconciliation sweep, or a
  # school marking it by hand — goes through here. Automatic access mail runs only when
  # SchoolLab::Features.auto_provision_guardian_access? is enabled, and only on the transition
  # to signed, not on every replay of an already-signed contract.
  class MarkSignedService < ApplicationService
    def initialize(contract:)
      @contract = contract
    end

    def call
      was_pending = !contract.signed?

      unless contract.mark_signed!
        return ResponseService.failure(code: :validation_error, details: contract.errors.to_hash)
      end

      enqueue_access_provisioning if was_pending

      ResponseService.success(data: contract)
    end

    private

    attr_reader :contract

    def enqueue_access_provisioning
      unless SchoolLab::Features.auto_provision_guardian_access?
        Rails.logger.info(
          {
            event: "contract.guardian_access_skipped",
            contract_id: contract.id,
            school_id: contract.school_id,
            reason: "feature_disabled"
          }.to_json
        )
        return
      end

      Contracts::ProvisionGuardianAccessJob.perform_later(contract.id, contract.school_id)
    end
  end
end
