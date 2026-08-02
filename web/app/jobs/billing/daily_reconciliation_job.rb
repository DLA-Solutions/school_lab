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
        failures << { school_id: config.school_id, error: redact_error(e) }
        Rails.logger.error(
          log_payload(
            event: "billing.daily_reconciliation.school_failed",
            school_id: config.school_id,
            provider: config.provider,
            error: redact_error(e)
          )
        )
      end

      Rails.logger.info(log_payload(event: "billing.daily_reconciliation.completed", failures: failures)) if failures.any?
    end

    private

    def redact_error(error)
      Billing::PiiRedactor.call(error.message)
    end

    def log_payload(payload)
      payload.to_json
    end
  end
end
