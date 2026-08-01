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

      Billing::IssueChargeService.call(charge: charge)
    rescue Gateways::BankSlip::TransientError => e
      handle_transient_failure(charge, e)
      raise
    end

    private

    def handle_transient_failure(charge, error)
      issuance = charge.current_issuance
      return unless issuance

      issuance.update!(last_error: sanitized_error_message(error))
      issuance.mark_failed! if executions >= MAX_ATTEMPTS && issuance.may_mark_failed?
    end

    def sanitized_error_message(error)
      error.message.to_s
    end
  end
end
