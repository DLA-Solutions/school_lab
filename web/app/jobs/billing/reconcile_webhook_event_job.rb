# frozen_string_literal: true

module Billing
  class ReconcileWebhookEventJob < ApplicationJob
    queue_as :billing

    MAX_ATTEMPTS = 5

    retry_on Gateways::BankSlip::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(webhook_event_id)
      webhook_event = WebhookEvent.find(webhook_event_id)
      Billing::ReconcileInvoicePaymentService.call(webhook_event: webhook_event)
    end
  end
end
