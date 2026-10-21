# frozen_string_literal: true

module Minutes
  # Cancels a draft or pending ata (UC-LA06, BR-LA05). A signed ata is a record and cannot be
  # cancelled. As with contracts, the provider is told first: an ata marked cancelled here while its
  # link still collects signatures is the one outcome that must not happen, so a provider failure
  # leaves the ata untouched. A draft that never reached the provider is cancelled locally alone.
  class CancelService < ApplicationService
    def initialize(entry:, actor: nil)
      @entry = entry
      @actor = actor
    end

    def call
      return not_cancellable unless entry.may_cancel?

      withdrawn = withdraw_from_provider
      return withdrawn if withdrawn.is_a?(ResponseService)

      entry.cancel!

      Rails.logger.info(
        {
          event: "minutes.cancelled",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          reached_provider: entry.provider_document_id.present?,
          actor_id: actor&.id
        }.to_json
      )

      ResponseService.success(data: entry)
    end

    private

    attr_reader :entry, :actor

    def withdraw_from_provider
      return nil if entry.provider_document_id.blank?

      config = Gateways::Signature::Registry.active_config(school: entry.school)
      adapter = Gateways::Signature::Registry.resolve(school: entry.school, config: config)
      adapter.cancel_document(provider_document_id: entry.provider_document_id)

      nil
    rescue Gateways::Signature::Registry::MissingConfigurationError, Gateways::Signature::Error,
           SchoolLab::Http::ConnectionError => e
      log_provider_failure(e)

      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.minutes_cancel_provider_failed") ] }
      )
    end

    def not_cancellable
      ResponseService.failure(
        code: :invalid_state_transition,
        details: { base: [ I18n.t("api.errors.minutes_entry_not_cancellable") ] }
      )
    end

    def log_provider_failure(error)
      Rails.logger.error(
        {
          event: "minutes.cancel_provider_failed",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
