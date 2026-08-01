# frozen_string_literal: true

module Billing
  class IngestProviderWebhookService < ApplicationService
    def initialize(config:, event:)
      @config = config
      @event = event
    end

    def call
      if WebhookEvent.exists?(provider: event.provider, provider_event_id: event.provider_event_id)
        return ResponseService.success(data: :duplicate)
      end

      webhook_event = WebhookEvent.create!(
        school: config.school,
        provider: event.provider,
        provider_event_id: event.provider_event_id,
        event_type: event.event_type,
        provider_resource_id: event.provider_resource_id,
        payload: event.payload
      )

      mismatch = school_mismatch?
      if mismatch
        webhook_event.update!(
          processing_error: "school_mismatch: resource belongs to school #{mismatch}",
          processed_at: Time.current
        )
        return ResponseService.success(data: :school_mismatch)
      end

      ReconcileWebhookEventJob.perform_later(webhook_event.id)
      ResponseService.success(data: webhook_event)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: :duplicate)
    end

    private

    attr_reader :config, :event

    def school_mismatch?
      return nil if event.provider_resource_id.blank?

      issuance = ChargeIssuance.find_by(provider_invoice_id: event.provider_resource_id)
      return nil unless issuance
      return nil if issuance.school_id == config.school_id

      issuance.school_id
    end
  end
end
