# frozen_string_literal: true

module Billing
  # Deliberately a separate job from Billing::DailyReconciliationJob: the two have different
  # semantics — DailyReconciliationJob only matches/settles existing ChargeIssuance rows,
  # while this one creates brand-new Charge records from boletos the school created
  # directly at the bank. Inter only, for now (Cora out of scope — see
  # docs/open-questions.md).
  class ImportExternalBoletosJob < ApplicationJob
    queue_as :billing

    def perform
      failures = []

      SchoolPaymentProvider.active.where(provider: "inter", instrument: "bank_slip").find_each do |config|
        result = ImportExternalBoletosService.call(config: config)
        next if result.success?

        failures << { school_id: config.school_id, error_code: result.error_code, details: result.details }
      rescue Gateways::BankSlip::AuthenticationError => e
        failures << { school_id: config.school_id, error: redact_error(e) }
        Rails.logger.error(
          log_payload(
            event: "billing.import_external_boletos.school_failed",
            school_id: config.school_id,
            provider: config.provider,
            error: redact_error(e)
          )
        )
      end

      Rails.logger.info(log_payload(event: "billing.import_external_boletos.completed", failures: failures)) if failures.any?
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
