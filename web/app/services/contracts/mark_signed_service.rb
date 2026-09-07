# frozen_string_literal: true

module Contracts
  # Records that a contract was signed and kicks off guardian access provisioning and the
  # school-side notification.
  #
  # Every path that marks a contract signed — Autentique webhook, reconciliation sweep, or a
  # school marking it by hand — goes through here so both fire once, on the transition to signed,
  # not on every replay of an already-signed contract.
  class MarkSignedService < ApplicationService
    def initialize(contract:)
      @contract = contract
    end

    def call
      was_pending = !contract.signed?

      unless contract.mark_signed!
        return ResponseService.failure(code: :validation_error, details: contract.errors.to_hash)
      end

      on_newly_signed if was_pending

      ResponseService.success(data: contract)
    end

    private

    attr_reader :contract

    def on_newly_signed
      Contracts::ProvisionGuardianAccessJob.perform_later(contract.id, contract.school_id)
      Notifications::NotifyContractSignedJob.perform_later(contract.id, contract.school_id)
    end
  end
end
