# frozen_string_literal: true

module Contracts
  # Asks the provider what actually became of a contract and records it.
  #
  # The webhook says *that* something changed; this says *what*. Reading the document back rather
  # than trusting the callback's body means a payload whose shape we mis-read, a delivery that
  # never arrived, and a callback replayed twice all converge on the same answer — the provider's.
  #
  # Marking signed is idempotent: `Contract#mark_signed!` keeps the original signature date rather
  # than moving it forward on a second pass.
  class ReconcileSignatureService < ApplicationService
    def initialize(contract:)
      @contract = contract
    end

    def call
      return not_sent if contract.provider_document_id.blank?

      # Nothing left to learn: it is signed and we already know where the signed file is. A
      # contract signed before that address was being recorded still goes and fetches it.
      if contract.signed? && contract.signed_document_url.present?
        return ResponseService.success(data: { contract: contract, status: "signed" })
      end

      document = fetch
      return document if document.is_a?(ResponseService)

      if document.status == "signed"
        contract.mark_signed!
        # The address is derived from the document id and does not expire, so caching it saves a
        # provider round-trip every time the listing is drawn.
        record_signed_file(document.signed_file_url)
      end

      log(status: document.status)

      ResponseService.success(data: { contract: contract.reload, status: document.status })
    end

    private

    attr_reader :contract

    def fetch
      config = Gateways::Signature::Registry.active_config(school: contract.school)
      adapter = Gateways::Signature::Registry.resolve(school: contract.school, config: config)

      adapter.fetch_document(provider_document_id: contract.provider_document_id)
    rescue Gateways::Signature::Registry::MissingConfigurationError, Gateways::Signature::Error => e
      log_failure(e)
      ResponseService.failure(code: :provider_error, details: { base: [ e.message ] })
    end

    def record_signed_file(url)
      return if url.blank? || contract.signed_document_url == url

      contract.update_column(:signed_document_url, url)
    end

    def not_sent
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_not_sent") ] }
      )
    end

    def log(status:)
      Rails.logger.info(
        {
          event: "signature.reconciled",
          contract_id: contract.id,
          school_id: contract.school_id,
          provider_document_id: contract.provider_document_id,
          status: status
        }.to_json
      )
    end

    def log_failure(error)
      Rails.logger.error(
        {
          event: "signature.reconcile_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
