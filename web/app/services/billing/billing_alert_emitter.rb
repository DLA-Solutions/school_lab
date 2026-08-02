# frozen_string_literal: true

module Billing
  class BillingAlertEmitter
    class << self
      def certificate_expiry(config:, days_remaining:, threshold:, outage: false)
        severity = outage ? "outage" : "warning"
        Rails.logger.public_send(outage ? :error : :warn,
                                 {
                                   event: "billing.alert.certificate_expiry",
                                   severity: severity,
                                   school_id: config.school_id,
                                   provider: config.provider,
                                   instrument: config.instrument,
                                   environment: config.environment,
                                   certificate_expires_at: config.certificate_expires_at&.iso8601,
                                   days_remaining: days_remaining,
                                   threshold_days: threshold
                                 }.to_json)
      end

      def issuance_failure(issuance:)
        Rails.logger.warn(
          {
            event: "billing.alert.issuance_failure",
            severity: "warning",
            school_id: issuance.school_id,
            charge_id: issuance.charge_id,
            issuance_id: issuance.id,
            reason: sanitized_reason(issuance.last_error)
          }.to_json
        )
      end

      def unissued_charges(school:, never_attempted:, permanently_failed:)
        Rails.logger.warn(
          {
            event: "billing.alert.unissued_charges",
            severity: "warning",
            school_id: school.id,
            never_attempted_count: never_attempted.size,
            permanently_failed_count: permanently_failed.size,
            never_attempted_charge_ids: never_attempted.map(&:id),
            permanently_failed_charge_ids: permanently_failed.map(&:id)
          }.to_json
        )
      end

      def evaluation_failure(school_id:, error:)
        Rails.logger.error(
          {
            event: "billing.alert.evaluation_failure",
            severity: "error",
            school_id: school_id,
            error: error
          }.to_json
        )
      end

      private

      def sanitized_reason(reason)
        reason.to_s.gsub(/\d{3}\.\d{3}\.\d{3}-\d{2}/, "[CPF]")
                    .gsub(/\S+@\S+\.\S+/, "[EMAIL]")
      end
    end
  end
end
