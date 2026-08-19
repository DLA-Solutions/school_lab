# frozen_string_literal: true

module Webhooks
  module Parsers
    class IuguPlatformBilling
      EVENT_MAP = {
        "invoice.created" => "billing.invoice.finalized",
        "invoice.status_changed" => :invoice_status,
        "invoice.released" => "billing.invoice.paid",
        "invoice.payment_failed" => "billing.invoice.payment_failed",
        "subscription.created" => "billing.subscription.activated",
        "subscription.activated" => "billing.subscription.activated",
        "subscription.suspended" => "billing.subscription.past_due",
        "subscription.expired" => "billing.subscription.canceled",
        "subscription.changed" => "billing.subscription.plan_changed",
        "subscription.renewed" => "billing.subscription.activated"
      }.freeze

      class << self
        def parse(request)
          payload = extract_payload(request)
          vendor_event = payload["event"].to_s
          data = normalize_data(payload["data"])
          data = payload.except("event") if data.blank?
          return ResponseService.failure(code: :validation_error) if vendor_event.blank?

          resource_id = data["id"].presence || data["subscription_id"].presence
          return ResponseService.failure(code: :validation_error) if resource_id.blank?

          event_type = canonical_event(vendor_event, data)
          provider_event_id = [ vendor_event, resource_id, data["status"] ].compact.join(":")

          event = Gateways::PlatformSubscription::ValueObjects::DomainEvent.new(
            provider: "iugu",
            provider_event_id: provider_event_id,
            event_type: event_type,
            external_subscription_id: data["subscription_id"].presence || (vendor_event.start_with?("subscription.") ? data["id"] : nil),
            external_invoice_id: vendor_event.start_with?("invoice.") ? data["id"] : data["invoice_id"],
            payload: payload
          )

          ResponseService.success(data: event)
        end

        private

        def extract_payload(request)
          raw = request.request_parameters
          {
            "event" => raw["event"] || raw[:event],
            "data" => raw["data"] || raw[:data]
          }
        end

        def normalize_data(data)
          return {} if data.blank?
          return data.to_unsafe_h if data.respond_to?(:to_unsafe_h)
          return data if data.is_a?(Hash)

          {}
        end

        def canonical_event(vendor_event, data)
          mapped = EVENT_MAP[vendor_event]
          return mapped unless mapped == :invoice_status

          case data["status"].to_s
          when "paid" then "billing.invoice.paid"
          when "expired", "canceled", "cancelled" then "billing.invoice.payment_failed"
          else "billing.invoice.finalized"
          end
        end
      end
    end
  end
end
