# frozen_string_literal: true

module Billing
  class ReconcileFiscalWebhookJob < ApplicationJob
    queue_as :billing

    MAX_ATTEMPTS = 5

    retry_on Gateways::ServiceInvoice::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(webhook_event_id)
      webhook_event = WebhookEvent.find(webhook_event_id)
      invoice = ServiceInvoice.find_by(
        school_id: webhook_event.school_id,
        provider_document_id: webhook_event.provider_resource_id
      )
      return unless invoice

      Billing::ReconcileFiscalDocumentService.call(service_invoice: invoice)
      webhook_event.update!(processed_at: Time.current)
    end
  end
end
