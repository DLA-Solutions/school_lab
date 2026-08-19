# frozen_string_literal: true

module Platform
  class IngestBillingWebhookService < ApplicationService
    def initialize(event:, provider: nil, token: nil)
      @event = event
      @provider = provider
      @token = token
    end

    def call
      if token.present?
        settings = PlatformBillingSetting.instance
        return ResponseService.failure(code: :not_found) unless ActiveSupport::SecurityUtils.secure_compare(
          settings.webhook_endpoint_token, token.to_s
        )
      end

      if WebhookEvent.exists?(provider: event.provider, provider_event_id: event.provider_event_id)
        return ResponseService.success(data: :duplicate)
      end

      school = match_school
      webhook_event = WebhookEvent.create!(
        school: school,
        provider: event.provider,
        provider_event_id: event.provider_event_id,
        event_type: event.event_type,
        provider_resource_id: event.external_subscription_id.presence || event.external_invoice_id,
        payload: event.payload.is_a?(String) ? event.payload : event.payload&.to_json
      )

      ReconcileBillingEventJob.perform_later(webhook_event.id)
      ResponseService.success(data: webhook_event)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: :duplicate)
    end

    private

    attr_reader :event, :provider, :token

    def match_school
      if event.external_subscription_id.present?
        sub = PlatformSubscription.find_by(
          provider: event.provider,
          external_subscription_id: event.external_subscription_id
        )
        return sub&.school
      end

      return if event.external_invoice_id.blank?

      PlatformInvoice.find_by(
        provider: event.provider,
        external_invoice_id: event.external_invoice_id
      )&.school
    end
  end
end
