# frozen_string_literal: true

module Billing
  # Follow-up to an asynchronous issuance (Banco Inter): fetches the boleto/Pix presentation
  # fields shortly after issuing, so the guardian does not depend on a webhook to see them.
  # Bounded: retries on a widening schedule, then stops; the webhook path and the
  # `billing:backfill_issuance_presentation` task remain as fallbacks.
  class SyncIssuancePresentationJob < ApplicationJob
    queue_as :billing

    # First read shortly after issuing; Inter usually has the boleto ready within seconds.
    INITIAL_DELAY = 10.seconds
    # Wait before retry N (executions - 1): six runs in total, about 43 minutes end to end.
    RETRY_DELAYS = [ 30.seconds, 2.minutes, 10.minutes, 30.minutes ].freeze
    MAX_ATTEMPTS = RETRY_DELAYS.size + 2
    TRANSIENT_ATTEMPTS = 5

    class PresentationPending < StandardError; end

    retry_on PresentationPending,
             attempts: MAX_ATTEMPTS,
             wait: ->(executions) { RETRY_DELAYS.fetch(executions - 1, RETRY_DELAYS.last) } do |job, _error|
      Rails.logger.error(
        { event: "billing.sync_issuance_presentation.gave_up", issuance_id: job.arguments.first }.to_json
      )
    end
    retry_on Gateways::BankSlip::TransientError, wait: :polynomially_longer, attempts: TRANSIENT_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def self.enqueue_for(issuance)
      set(wait: INITIAL_DELAY).perform_later(issuance.id, issuance.school_id)
    end

    def perform(issuance_id, school_id)
      school = School.kept.find(school_id)
      issuance = school.charge_issuances.find(issuance_id)

      result = Billing::SyncIssuancePresentationService.call(issuance: issuance)
      return if result.success?

      raise PresentationPending if result.error_code == :presentation_pending

      Rails.logger.error(
        {
          event: "billing.sync_issuance_presentation.provider_error",
          issuance_id: issuance.id,
          error_code: result.error_code
        }.to_json
      )
    end
  end
end
