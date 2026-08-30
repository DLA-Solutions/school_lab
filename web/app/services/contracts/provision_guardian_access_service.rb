# frozen_string_literal: true

module Contracts
  # Mails the financial responsible (or the first signer) a link to set their password once the
  # family has signed the enrollment contract.
  class ProvisionGuardianAccessService < ApplicationService
    def initialize(contract:)
      @contract = contract
    end

    def call
      guardian = contract.payer_guardian || contract.payer
      return no_guardian if guardian.blank?
      return already_has_access if guardian_already_has_access?(guardian)

      People::SendGuardianAccessService.call(guardian: guardian)
    end

    private

    attr_reader :contract

    def guardian_already_has_access?(guardian)
      user = guardian.user
      return false if user.blank?

      membership = guardian.school.memberships.kept.find_by(user: user, role: "guardian")
      membership&.active?
    end

    def no_guardian
      Rails.logger.info(
        {
          event: "contract.guardian_access_skipped",
          contract_id: contract.id,
          school_id: contract.school_id,
          reason: "no_payer"
        }.to_json
      )

      ResponseService.success(data: { skipped: true, reason: :no_payer })
    end

    def already_has_access
      Rails.logger.info(
        {
          event: "contract.guardian_access_skipped",
          contract_id: contract.id,
          school_id: contract.school_id,
          reason: "already_has_access"
        }.to_json
      )

      ResponseService.success(data: { skipped: true, reason: :already_has_access })
    end
  end
end
