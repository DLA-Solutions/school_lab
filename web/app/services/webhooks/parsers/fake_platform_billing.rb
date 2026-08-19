# frozen_string_literal: true

module Webhooks
  module Parsers
    class FakePlatformBilling
      class << self
        def parse(request)
          body = parse_body(request)
          event_id = body["id"].presence || body["event_id"]
          return ResponseService.failure(code: :validation_error) if event_id.blank?

          event = Gateways::PlatformSubscription::ValueObjects::DomainEvent.new(
            provider: "fake",
            provider_event_id: event_id.to_s,
            event_type: body["event_type"].presence || "billing.invoice.paid",
            external_subscription_id: body["subscription_id"],
            external_invoice_id: body["invoice_id"],
            payload: body
          )
          ResponseService.success(data: event)
        end

        private

        def parse_body(request)
          raw = request.raw_post
          return request.params.to_unsafe_h if raw.blank?

          JSON.parse(raw)
        rescue JSON::ParserError
          request.params.to_unsafe_h
        end
      end
    end
  end
end
