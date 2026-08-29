# frozen_string_literal: true

module Platform
  class ReconcileBillingEventJob < ApplicationJob
    queue_as :default

    MAX_ATTEMPTS = 5

    retry_on Gateways::PlatformSubscription::TransientError, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    discard_on ActiveRecord::RecordNotFound

    def perform(webhook_event_id)
      webhook_event = WebhookEvent.find(webhook_event_id)
      ReconcileBillingEventService.call(webhook_event: webhook_event)
    end
  end
end
