# frozen_string_literal: true

module Billing
  class ProcessProviderWebhookService < ApplicationService
    def initialize(payload:)
      @payload = payload
    end

    def call
      data = JSON.parse(payload)
      provider = data.fetch("provider")
      provider_event_id = data.fetch("event_id")
      if WebhookEvent.exists?(provider: provider, provider_event_id: provider_event_id)
        return ResponseService.success(data: :duplicate)
      end

      event = WebhookEvent.create!(
        provider: provider,
        provider_event_id: provider_event_id,
        event_type: data["event_type"],
        payload: payload
      )

      process_payment(data, event)
    rescue JSON::ParserError
      ResponseService.failure(code: :validation_error)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: :duplicate)
    end

    private

    attr_reader :payload

    def process_payment(data, event)
      return complete_event(event, :ignored) unless data["event_type"] == "payment.confirmed"

      issuance = ChargeIssuance.find_by_provider_invoice_id!(data.fetch("provider_invoice_id"))
      charge = issuance.charge
      if charge.paid?
        complete_event(event, :duplicate)
        return ResponseService.success(data: :duplicate)
      end

      ActiveRecord::Base.transaction do
        Payment.create!(
          charge: charge,
          school: charge.school,
          paid_amount_cents: data.fetch("paid_amount_cents"),
          payment_method: data.fetch("payment_method", "pix"),
          provider_payment_id: data.fetch("provider_payment_id"),
          paid_at: Time.zone.parse(data.fetch("paid_at")),
          status: "confirmed"
        )
        charge.pay!
      end

      complete_event(event, :processed)
      ResponseService.success(data: charge)
    end

    def complete_event(event, _status)
      event.update!(processed_at: Time.current)
    end
  end
end
