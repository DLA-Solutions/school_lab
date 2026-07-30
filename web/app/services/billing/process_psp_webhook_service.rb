# frozen_string_literal: true

module Billing
  class ProcessPspWebhookService < ApplicationService
    def initialize(payload:, signature:, gateway: Gateways::Psp::Fake.new)
      @payload = payload
      @signature = signature
      @gateway = gateway
    end

    def call
      return ResponseService.failure(code: :forbidden) unless gateway.verify_signature(payload: payload, signature: signature)

      data = JSON.parse(payload)
      psp_event_id = data.fetch("event_id")
      return ResponseService.success(data: :duplicate) if WebhookEvent.exists?(psp_event_id: psp_event_id)

      event = WebhookEvent.create!(
        psp_event_id: psp_event_id,
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

    attr_reader :payload, :signature, :gateway

    def process_payment(data, event)
      return complete_event(event, :ignored) unless data["event_type"] == "payment.confirmed"

      charge = Charge.kept.find_by!(psp_charge_id: data.fetch("psp_charge_id"))
      if charge.paid?
        complete_event(event, :duplicate)
        return ResponseService.success(data: :duplicate)
      end

      ActiveRecord::Base.transaction do
        Payment.create!(
          charge: charge,
          school: charge.school,
          paid_amount: data.fetch("paid_amount"),
          payment_method: data.fetch("payment_method", "pix"),
          psp_transaction_id: data.fetch("psp_transaction_id"),
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
