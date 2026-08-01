# frozen_string_literal: true

module Webhooks
  module Parsers
    class Cora
      HEADER_EVENT_ID = "HTTP_WEBHOOK_EVENT_ID"
      HEADER_EVENT_TYPE = "HTTP_WEBHOOK_EVENT_TYPE"
      HEADER_RESOURCE_ID = "HTTP_WEBHOOK_RESOURCE_ID"

      class << self
        def parse(request)
          event_id = request.headers[HEADER_EVENT_ID].presence
          event_type = request.headers[HEADER_EVENT_TYPE].presence
          resource_id = request.headers[HEADER_RESOURCE_ID].presence

          return ResponseService.failure(code: :validation_error) if event_id.blank?

          event = Gateways::BankSlip::ValueObjects::Event.new(
            provider: Gateways::BankSlip::Cora::Adapter::PROVIDER,
            provider_event_id: event_id,
            event_type: event_type,
            provider_resource_id: resource_id,
            payload: nil
          )

          ResponseService.success(data: event)
        end
      end
    end
  end
end
