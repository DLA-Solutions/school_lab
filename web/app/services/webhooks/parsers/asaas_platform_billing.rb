# frozen_string_literal: true

module Webhooks
  module Parsers
    class AsaasPlatformBilling
      EVENT_MAP = {
        "PAYMENT_CREATED" => "billing.invoice.finalized",
        "PAYMENT_UPDATED" => :payment_status,
        "PAYMENT_RECEIVED" => "billing.invoice.paid",
        "PAYMENT_CONFIRMED" => "billing.invoice.paid",
        "PAYMENT_OVERDUE" => "billing.invoice.payment_failed",
        "PAYMENT_DELETED" => "billing.invoice.payment_failed",
        "PAYMENT_REFUNDED" => "billing.invoice.payment_failed",
        "SUBSCRIPTION_CREATED" => "billing.subscription.activated",
        "SUBSCRIPTION_UPDATED" => "billing.subscription.plan_changed",
        "SUBSCRIPTION_INACTIVATED" => "billing.subscription.past_due",
        "SUBSCRIPTION_DELETED" => "billing.subscription.canceled"
      }.freeze

      class << self
        def parse(request)
          payload = extract_payload(request)
          vendor_event = payload["event"].to_s
          return ResponseService.failure(code: :validation_error) if vendor_event.blank?

          payment = normalize_hash(payload["payment"])
          subscription = normalize_hash(payload["subscription"])
          resource_id = payload["id"].presence || payment["id"].presence || subscription["id"].presence
          return ResponseService.failure(code: :validation_error) if resource_id.blank?

          event_type = canonical_event(vendor_event, payment)
          provider_event_id = payload["id"].presence || [ vendor_event, resource_id, payment["status"] ].compact.join(":")

          event = Gateways::PlatformSubscription::ValueObjects::DomainEvent.new(
            provider: "asaas",
            provider_event_id: provider_event_id.to_s,
            event_type: event_type,
            external_subscription_id: subscription["id"].presence || payment["subscription"],
            external_invoice_id: payment["id"],
            payload: payload
          )

          ResponseService.success(data: event)
        end

        private

        def extract_payload(request)
          raw = request.request_parameters
          return raw if raw.is_a?(Hash) && raw["event"].present?

          parse_body(request)
        end

        def parse_body(request)
          body = request.raw_post
          return request.params.to_unsafe_h if body.blank?

          JSON.parse(body)
        rescue JSON::ParserError
          request.params.to_unsafe_h
        end

        def normalize_hash(data)
          return {} if data.blank?
          return data.to_unsafe_h if data.respond_to?(:to_unsafe_h)
          return data if data.is_a?(Hash)

          {}
        end

        def canonical_event(vendor_event, payment)
          mapped = EVENT_MAP[vendor_event]
          return mapped unless mapped == :payment_status

          case payment["status"].to_s
          when "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH" then "billing.invoice.paid"
          when "OVERDUE", "REFUNDED", "DELETED" then "billing.invoice.payment_failed"
          else "billing.invoice.finalized"
          end
        end
      end
    end
  end
end
