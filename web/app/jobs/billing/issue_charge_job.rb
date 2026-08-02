# frozen_string_literal: true

module Billing
  class IssueChargeJob < ApplicationJob
    queue_as :billing

    MAX_ATTEMPTS = 5

    retry_on Gateways::BankSlip::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(charge_id, school_id)
      school = School.kept.find(school_id)
      charge = school.charges.kept.find(charge_id)

      result = Billing::IssueChargeService.call(charge: charge)
      log_permanent_failure(charge, result) if result.failure?
    rescue Gateways::BankSlip::TransientError => e
      handle_transient_failure(charge, e)
      raise
    end

    private

    # The service already recorded the failure on the issuance; surface it for ops too.
    def log_permanent_failure(charge, result)
      Rails.logger.error(
        {
          event: "billing.issue_charge.permanent_failure",
          school_id: charge.school_id,
          charge_id: charge.id,
          error_code: result.error_code
        }.to_json
      )
    end

    def handle_transient_failure(charge, error)
      issuance = charge.current_issuance
      return unless issuance

      issuance.update!(last_error: Billing::PiiRedactor.call(error.message))
      issuance.mark_failed! if executions >= MAX_ATTEMPTS && issuance.may_mark_failed?
    end
  end
end
