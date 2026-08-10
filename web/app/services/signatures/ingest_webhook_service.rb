# frozen_string_literal: true

module Signatures
  # Turns a verified callback into a state change on the contract it belongs to.
  #
  # Autentique nests the event one level down, under `event` — the top level describes the webhook
  # registration itself, not what happened:
  #
  #   { "object": "webhook", "url": "...", "event": { "type": "document.finished",
  #     "data": { "object": { "id": "<document id>" } } } }
  #
  # Reading `type` off the root, as this used to, matched nothing: every callback was acknowledged
  # and discarded, and contracts stayed "aguardando assinatura" after the family had signed.
  #
  # Anything concerning a document we know sends us back to the provider to ask what became of
  # it, rather than inferring it from the body — so a renamed event, a replay, or a payload we
  # half-understand all end at the same answer.
  #
  # `document.finished` is the exception, and deliberately so: the provider states it means every
  # signature is in. A read that still says "pending" right after it is the provider being behind
  # itself, not a contradiction, so the event wins.
  class IngestWebhookService < ApplicationService
    FINISHED_EVENT = "document.finished"

    # Everything else — member events, webhook bookkeeping — is acknowledged and ignored.
    RECONCILABLE_PREFIXES = %w[document. signature.].freeze

    def initialize(config:, payload:)
      @config = config
      @payload = payload
    end

    def call
      body = parse
      return ResponseService.failure(code: :validation_error) if body.blank?

      event = body["event"].is_a?(Hash) ? body["event"] : body
      type = event["type"].to_s
      document_id = document_id_from(event)

      # Acknowledged, not acted upon — the provider must not retry an event we simply ignore.
      return ResponseService.success unless reconcilable?(type) && document_id.present?

      contract = config.school.contracts.kept.find_by(provider_document_id: document_id)

      # Same reasoning: a document this school does not know about is not a failure to retry.
      unless contract
        log(event: "signature.webhook_unknown_document", document_id: document_id, type: type)
        return ResponseService.success
      end

      reconcile(contract, type)
    end

    private

    attr_reader :config, :payload

    def reconcile(contract, type)
      finished = type == FINISHED_EVENT
      result = ::Contracts::ReconcileSignatureService.call(contract: contract)

      unless result.success?
        # The provider is unreachable. A finished event reached us over a channel we verified, so
        # it stands on its own; anything else asks for redelivery, and the sweep is the backstop
        # if the retries run out.
        return finish(contract, type, "signed") if finished

        log(event: "signature.webhook_reconcile_failed", contract_id: contract.id, type: type)
        return result
      end

      status = result.data.fetch(:status)
      return finish(contract, type, "signed") if finished && status != "signed"

      log(event: "signature.webhook_reconciled", contract_id: contract.id, type: type, status: status)

      ResponseService.success(data: contract)
    end

    def finish(contract, type, status)
      contract.mark_signed!

      log(event: "signature.webhook_finished_event", contract_id: contract.id, type: type,
          status: status)

      ResponseService.success(data: contract)
    end

    def reconcilable?(type)
      RECONCILABLE_PREFIXES.any? { |prefix| type.start_with?(prefix) }
    end

    # `event.data.object.id` is where Autentique puts it; the flatter shapes are accepted so a
    # hand-made replay or an older payload still lands.
    def document_id_from(event)
      event.dig("data", "object", "id") || event.dig("data", "id") || event["id"]
    end

    def parse
      parsed = JSON.parse(payload.to_s)

      parsed.is_a?(Hash) ? parsed : nil
    rescue JSON::ParserError
      nil
    end

    def log(event:, **attributes)
      Rails.logger.info({ event: event, school_id: config.school_id, **attributes }.to_json)
    end
  end
end
