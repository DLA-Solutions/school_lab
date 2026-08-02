# frozen_string_literal: true

module Billing
  class MonthlyChargeGenerationJob < ApplicationJob
    queue_as :billing

    def perform
      billing_period = Date.current.beginning_of_month
      failures = []

      SchoolPaymentProvider.active.find_each do |config|
        Billing::GenerateChargesJob.perform_later(
          school_id: config.school_id,
          billing_period: billing_period
        )
      rescue StandardError => e
        failures << { school_id: config.school_id, error: sanitized_error_message(e) }
        Rails.logger.error(
          event: "billing.monthly_charge_generation.school_failed",
          school_id: config.school_id,
          error: sanitized_error_message(e)
        )
      end

      Rails.logger.info(event: "billing.monthly_charge_generation.completed", failures: failures) if failures.any?
    end

    private

    def sanitized_error_message(error)
      error.message.to_s
    end
  end
end
