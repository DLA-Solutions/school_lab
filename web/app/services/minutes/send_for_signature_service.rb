# frozen_string_literal: true

module Minutes
  # Renders an ata and hands it to the e-signature provider, addressed to every participant flagged
  # as a signer (UC-LA04, BR-LA06). Mirrors `Contracts::SendForSignatureService`:
  #
  # - the ata is only marked `pending_signature` once the provider has accepted the document — a row
  #   claiming to await signature when nothing left the building is worse than an error;
  # - a signer without an e-mail or CPF stops the send, and the error names who to complete;
  # - provider failures map the same way (`validation_error` for configuration/credentials/refusal,
  #   `provider_error` when the provider is unreachable).
  #
  # Students are never signers (the model refuses `signs` on a student link).
  class SendForSignatureService < ApplicationService
    def initialize(entry:, actor: nil)
      @entry = entry
      @actor = actor
    end

    def call
      return not_sendable unless entry.may_request_signature?

      signers = entry.signers
      return no_signers if signers.empty?

      invalid = signers.reject(&:signer_ready?)
      return missing_signer_details(invalid) if invalid.any?

      rendered = RenderPdfService.call(entry: entry)
      return rendered if rendered.failure?

      dispatch(rendered.data, signers)
    end

    private

    attr_reader :entry, :actor

    def dispatch(rendered, signers)
      config = Gateways::Signature::Registry.active_config(school: entry.school)
      adapter = Gateways::Signature::Registry.resolve(school: entry.school, config: config)

      document = adapter.create_document(build_request(rendered, signers))

      record_sent(config, document)

      ResponseService.success(data: { entry: entry, signer_links: document.signer_links })
    rescue Gateways::Signature::Registry::MissingConfigurationError => e
      log_failure(e)
      failure(:validation_error, I18n.t("api.errors.signature_provider_missing"))
    rescue Gateways::Signature::AuthenticationError => e
      log_failure(e)
      failure(:validation_error, I18n.t("api.errors.signature_provider_unauthorized"))
    rescue Gateways::Signature::TransientError => e
      log_failure(e)
      failure(:provider_error, I18n.t("api.errors.signature_provider_unavailable"))
    rescue Gateways::Signature::Error => e
      log_failure(e)
      failure(:validation_error, e.message)
    end

    def record_sent(config, document)
      ActiveRecord::Base.transaction do
        entry.update!(
          signature_provider: config.provider,
          provider_document_id: document.provider_document_id,
          signature_requested_at: Time.current
        )
        entry.request_signature!
      end
    end

    def build_request(rendered, signers)
      Gateways::Signature::ValueObjects::SignatureRequest.new(
        name: "#{RenderPdfService::KIND_LABELS.fetch(entry.kind)} — #{entry.title}",
        pdf: rendered.fetch(:pdf),
        content_type: "application/pdf",
        filename: rendered.fetch(:filename),
        message: I18n.t("signature.minutes_message", title: entry.title, school: entry.school.name),
        signers: signers.map { |participant| signer_for(participant, rendered) }
      )
    end

    def signer_for(participant, rendered)
      position = rendered[:signature_positions]&.fetch(participant.id, nil)

      Gateways::Signature::ValueObjects::Signer.new(
        name: participant.name,
        email: participant.email,
        cpf: participant.cpf,
        positions: position ? [ position ] : []
      )
    end

    def not_sendable
      failure(:invalid_state_transition, I18n.t("api.errors.minutes_entry_not_sendable"))
    end

    def no_signers
      failure(:validation_error, I18n.t("api.errors.minutes_without_signers"))
    end

    # Named, so the school knows which participant to complete.
    def missing_signer_details(participants)
      failure(
        :validation_error,
        I18n.t("api.errors.signer_missing_details", names: participants.map(&:name).to_sentence)
      )
    end

    def failure(code, message)
      ResponseService.failure(code: code, details: { base: [ message ] })
    end

    def log_failure(error)
      Rails.logger.error(
        {
          event: "minutes.signature_send_failed",
          minutes_entry_id: entry.id,
          school_id: entry.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
