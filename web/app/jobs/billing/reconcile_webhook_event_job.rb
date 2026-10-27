# frozen_string_literal: true

module Billing
  class ReconcileWebhookEventJob < ApplicationJob
    queue_as :billing

    MAX_ATTEMPTS = 5
    AUTHENTICATION_RETRY_ATTEMPTS = 3

    # Raised when the provider rejected our credentials
    # (Gateways::BankSlip::AuthenticationError, mapped by
    # Billing::ReconcileInvoicePaymentService to ResponseService.failure(code:
    # :authentication_error)). Often a transient token-cache expiry rather than a hard
    # misconfiguration, so it gets a small bounded retry via `retry_on` below instead of the
    # "surface once, never retry" treatment for ReconciliationFailedError.
    class AuthenticationFailedError < StandardError; end

    # Raised for any other failure Solid Queue should surface as a failed job (provider/parser
    # errors, or an unrecognized error_code). Never auto-retried: the provider already gave us
    # its answer, so retrying blindly would just repeat the same response.
    class ReconciliationFailedError < StandardError; end

    # Failure codes that are expected business outcomes, not infrastructure failures.
    # Billing::ReconcileInvoicePaymentService#complete_event! already wrote a full trace onto
    # the webhook_event row (observed_status / processing_error) before returning these, so
    # re-raising here would only add failed-job noise with nothing retryable to fix:
    #   - :not_found                — no matching ChargeIssuance for the webhook's resource id.
    #   - :invalid_state_transition — Billing::RecordPaymentService found the charge in a state
    #     that cannot transition to paid (e.g. already cancelled).
    NON_RETRYABLE_FAILURE_CODES = %i[not_found invalid_state_transition].freeze

    retry_on Gateways::BankSlip::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS
    retry_on AuthenticationFailedError, wait: :polynomially_longer, attempts: AUTHENTICATION_RETRY_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(webhook_event_id)
      webhook_event = WebhookEvent.find(webhook_event_id)
      result = Billing::ReconcileInvoicePaymentService.call(webhook_event: webhook_event)
      return if result.success?

      handle_failure(webhook_event_id: webhook_event_id, error_code: result.error_code)
    end

    private

    def handle_failure(webhook_event_id:, error_code:)
      if NON_RETRYABLE_FAILURE_CODES.include?(error_code)
        Rails.logger.warn(
          { event: "billing.reconcile_webhook_event.non_retryable_failure",
            webhook_event_id: webhook_event_id, error_code: error_code }.to_json
        )
        return
      end

      raise AuthenticationFailedError, "webhook_event_id=#{webhook_event_id}" if error_code == :authentication_error

      raise ReconciliationFailedError, "webhook_event_id=#{webhook_event_id} error_code=#{error_code}"
    end
  end
end
