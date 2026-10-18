# frozen_string_literal: true

module Webhooks
  module Parsers
    class Inter
      class << self
        # Unlike Cora (header-only, no body) and Spedy/Fake (a single JSON object), Inter's
        # webhook callback body is a JSON array of entries. The parser contract is loosened to
        # allow ResponseService.success(data:) to carry either one Event or an array of Events —
        # Webhooks::ProvidersController normalizes with Array(parse_result.data) and loops, so
        # Cora/Spedy/Fake (still returning a single Event) continue to work unchanged: Kernel#
        # Array() on a plain Data.define instance with no #to_a wraps it as a one-element array.
        def parse(request)
          entries = Array(parse_body(request))
          return ResponseService.failure(code: :validation_error) if entries.empty?

          events = entries.filter_map { |entry| build_event(entry) }
          return ResponseService.failure(code: :validation_error) if events.empty?

          ResponseService.success(data: events)
        end

        private

        def build_event(entry)
          codigo_solicitacao = entry["codigoSolicitacao"]
          return nil if codigo_solicitacao.blank?

          # Combines all three so a retried, identical callback dedupes (idempotency in
          # Billing::IngestProviderWebhookService is keyed on provider_event_id), while a
          # genuinely new status transition for the same codigoSolicitacao gets a new id.
          Gateways::BankSlip::ValueObjects::Event.new(
            provider: Gateways::BankSlip::Inter::Adapter::PROVIDER,
            provider_event_id: [ codigo_solicitacao, entry["situacao"], entry["dataHoraSituacao"] ].compact.join(":"),
            event_type: entry["situacao"],
            provider_resource_id: codigo_solicitacao,
            payload: entry
          )
        end

        def parse_body(request)
          body = request.body.read
          return nil if body.blank?

          JSON.parse(body)
        rescue JSON::ParserError
          nil
        end
      end
    end
  end
end
