# frozen_string_literal: true

module Signatures
  # Turns a verified callback into a state change on the contract it belongs to.
  class IngestWebhookService < ApplicationService
    # The event that means every signer is done. The others are recorded and ignored: a contract
    # is either fully signed or still in flight, and partial progress changes nothing here.
    FINISHED_EVENT = "document.finished"

    def initialize(config:, payload:)
      @config = config
      @payload = payload
    end

    def call
      event = parse
      return ResponseService.failure(code: :validation_error) if event.blank?

      type = event["type"].to_s
      document_id = event.dig("data", "object", "id") || event.dig("data", "id")

      # Acknowledged, not acted upon — the provider must not retry an event we simply ignore.
      return ResponseService.success unless type == FINISHED_EVENT && document_id.present?

      contract = config.school.contracts.kept.find_by(provider_document_id: document_id)

      # Same reasoning: a document this school does not know about is not a failure to retry.
      unless contract
        log(event: "signature.webhook_unknown_document", document_id: document_id)
        return ResponseService.success
      end

      contract.mark_signed!
      log(event: "signature.contract_signed", document_id: document_id, contract_id: contract.id)

      ResponseService.success(data: contract)
    end

    private

    attr_reader :config, :payload

    def parse
      JSON.parse(payload.to_s)
    rescue JSON::ParserError
      nil
    end

    def log(event:, **attributes)
      Rails.logger.info({ event: event, school_id: config.school_id, **attributes }.to_json)
    end
  end
end
