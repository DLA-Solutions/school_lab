# frozen_string_literal: true

module Contracts
  # Calls off a contract the family has not signed yet — a wrong figure the school has to reissue,
  # or a family that decided not to go ahead.
  #
  # The provider is told first. A contract marked cancelled here while its link still collects
  # signatures is the one outcome that must not happen: the family would sign an agreement the
  # school considers dead, and the webhook would arrive for a contract nobody is expecting.
  class CancelSignatureService < ApplicationService
    def initialize(contract:, actor: nil)
      @contract = contract
      @actor = actor
    end

    def call
      return already_signed if contract.signed?
      return already_cancelled if contract.signature_cancelled?

      withdrawn = withdraw_from_provider
      return withdrawn if withdrawn.is_a?(ResponseService)

      contract.update!(
        signature_status: "cancelled",
        signature_cancelled_at: Time.current
      )

      Rails.logger.info(
        {
          event: "contract.signature_cancelled",
          contract_id: contract.id,
          school_id: contract.school_id,
          reached_provider: contract.provider_document_id.present?,
          actor_id: actor&.id
        }.to_json
      )

      ResponseService.success(data: contract)
    end

    private

    attr_reader :contract, :actor

    # A contract whose send never reached the provider has nothing to withdraw — it is cancelled
    # on our side alone, and that is the whole of it.
    def withdraw_from_provider
      return nil if contract.provider_document_id.blank?

      config = Gateways::Signature::Registry.active_config(school: contract.school)
      adapter = Gateways::Signature::Registry.resolve(school: contract.school, config: config)
      adapter.cancel_document(provider_document_id: contract.provider_document_id)

      nil
    rescue Gateways::Signature::Error, SchoolLab::Http::ConnectionError => e
      log_provider_failure(e)

      # Deliberately not cancelled locally: the document is still out there collecting
      # signatures, and saying otherwise would be a lie the school acts on.
      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.contract_cancel_provider_failed") ] }
      )
    end

    def already_signed
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_already_signed") ] }
      )
    end

    def already_cancelled
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.contract_already_cancelled") ] }
      )
    end

    def log_provider_failure(error)
      Rails.logger.error(
        {
          event: "contract.signature_cancel_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
