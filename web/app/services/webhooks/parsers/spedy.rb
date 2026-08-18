# frozen_string_literal: true

module Webhooks
  module Parsers
    class Spedy
      class << self
        def parse(request)
          payload = parse_body(request)
          event_id = payload.dig("data", "id") || payload["id"] || request.headers["HTTP_X_REQUEST_ID"]
          return ResponseService.failure(code: :validation_error) if event_id.blank?

          data = payload["data"] || payload
          event = Gateways::ServiceInvoice::ValueObjects::Event.new(
            provider: Gateways::ServiceInvoice::Spedy::Adapter::PROVIDER,
            provider_event_id: event_id.to_s,
            event_type: payload["event"] || payload["eventType"],
            provider_resource_id: data["id"]&.to_s || data["serviceInvoiceId"]&.to_s,
            payload: payload,
            company_federal_tax_number: data.dig("company", "federalTaxNumber"),
            company_id: data.dig("company", "id")&.to_s
          )

          ResponseService.success(data: event)
        end

        private

        def parse_body(request)
          body = request.body.read
          return {} if body.blank?

          JSON.parse(body)
        rescue JSON::ParserError
          {}
        end
      end
    end
  end
end
