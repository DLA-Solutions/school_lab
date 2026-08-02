# frozen_string_literal: true

module Billing
  class BillingAlertEmitter
    class << self
      def certificate_expiry(config:, days_remaining:, threshold:, outage: false)
        severity = outage ? "outage" : "warning"
        Rails.logger.public_send(
          outage ? :error : :warn,
          log_payload(
            event: "billing.alert.certificate_expiry",
            severity: severity,
            school_id: config.school_id,
            provider: config.provider,
            instrument: config.instrument,
            environment: config.environment,
            certificate_expires_at: config.certificate_expires_at&.iso8601,
            days_remaining: days_remaining,
            threshold_days: threshold
          )
        )
      end

      def issuance_failure(issuance:)
        Rails.logger.warn(
          log_payload(
            event: "billing.alert.issuance_failure",
            severity: "warning",
            school_id: issuance.school_id,
            charge_id: issuance.charge_id,
            issuance_id: issuance.id,
            correlation_id: issuance.idempotency_key,
            reason: Billing::PiiRedactor.call(issuance.last_error)
          )
        )
      end

      def unissued_charges(school:, never_attempted:, permanently_failed:)
        Rails.logger.warn(
          log_payload(
            event: "billing.alert.unissued_charges",
            severity: "warning",
            school_id: school.id,
            never_attempted_count: never_attempted.size,
            permanently_failed_count: permanently_failed.size,
            never_attempted_charge_ids: never_attempted.map(&:id),
            permanently_failed_charge_ids: permanently_failed.map(&:id)
          )
        )
      end

      def evaluation_failure(school_id:, error:)
        Rails.logger.error(
          log_payload(
            event: "billing.alert.evaluation_failure",
            severity: "error",
            school_id: school_id,
            error: Billing::PiiRedactor.call(error)
          )
        )
      end

      private

      def log_payload(payload)
        payload.to_json
      end
    end
  end
end
