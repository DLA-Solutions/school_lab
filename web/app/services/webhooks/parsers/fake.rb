# frozen_string_literal: true

module Webhooks
  module Parsers
    class Fake
      class << self
        def parse(request)
          data = JSON.parse(request.raw_post)
          event = Gateways::BankSlip::ValueObjects::Event.new(
            provider: Gateways::BankSlip::Fake::PROVIDER,
            provider_event_id: data.fetch("event_id"),
            event_type: data["event_type"],
            provider_resource_id: data["provider_invoice_id"],
            payload: request.raw_post
          )

          ResponseService.success(data: event)
        rescue JSON::ParserError, KeyError
          ResponseService.failure(code: :validation_error)
        end
      end
    end
  end
end
