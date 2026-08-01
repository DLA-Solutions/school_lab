# frozen_string_literal: true

module Billing
  class ReconcileWebhookEventJob < ApplicationJob
    queue_as :billing

    discard_on ActiveRecord::RecordNotFound

    def perform(webhook_event_id)
      webhook_event = WebhookEvent.find(webhook_event_id)
      ReconcileInvoicePaymentService.call(webhook_event: webhook_event)
    end
  end
end
