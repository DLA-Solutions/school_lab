# frozen_string_literal: true

module Billing
  class DailyReconciliationJob < ApplicationJob
    queue_as :billing

    def perform
      failures = []

      SchoolPaymentProvider.active.find_each do |config|
        result = DailyReconciliationService.call(config: config)
        next if result.success?

        failures << { school_id: config.school_id, error_code: result.error_code, details: result.details }
      rescue Gateways::BankSlip::AuthenticationError => e
        failures << { school_id: config.school_id, error: sanitized_error_message(e) }
        Rails.logger.error(
          event: "billing.daily_reconciliation.school_failed",
          school_id: config.school_id,
          provider: config.provider,
          error: sanitized_error_message(e)
        )
      end

      Rails.logger.info(event: "billing.daily_reconciliation.completed", failures: failures) if failures.any?
    end

    private

    def sanitized_error_message(error)
      error.message.to_s
    end
  end
end
