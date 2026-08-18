# frozen_string_literal: true

module Billing
  class IngestSpedyWebhookService < ApplicationService
    def initialize(event:)
      @event = event
    end

    def call
      if WebhookEvent.exists?(provider: event.provider, provider_event_id: event.provider_event_id)
        return ResponseService.success(data: :duplicate)
      end

      school = resolve_school
      return ResponseService.success(data: :school_not_found) unless school

      webhook_event = WebhookEvent.create!(
        school: school,
        provider: event.provider,
        provider_event_id: event.provider_event_id,
        event_type: event.event_type,
        provider_resource_id: event.provider_resource_id,
        payload: event.payload
      )

      ReconcileFiscalWebhookJob.perform_later(webhook_event.id)
      ResponseService.success(data: webhook_event)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: :duplicate)
    end

    private

    attr_reader :event

    def resolve_school
      if event.company_id.present?
        config = SchoolPaymentProvider.active
                                      .where(instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT, provider: "spedy")
                                      .find { |row| row.spedy_company_id.to_s == event.company_id.to_s }
        return config.school if config
      end

      if event.company_federal_tax_number.present?
        normalized = Cnpj.normalize(event.company_federal_tax_number)
        return School.kept.find_by(cnpj: normalized)
      end

      nil
    end
  end
end
