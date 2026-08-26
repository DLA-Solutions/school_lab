# frozen_string_literal: true

module Contracts
  # Renders the agreement and hands it to the e-signature provider, addressed to every party: the
  # student's guardians — both, or the single one on file — and the school itself, which signs as
  # a legal entity under its CNPJ. The school is required to sign, not merely invited to: a
  # contract cannot go out until the school has configured the CNPJ and signature e-mail that
  # make it a party able to sign, so no agreement leaves with the school as a bystander on its own
  # document.
  #
  # The contract is only recorded as sent once the provider has accepted it: a row claiming to be
  # awaiting signature when nothing left the building is worse than an error.
  class SendForSignatureService < ApplicationService
    def initialize(contract:, actor: nil)
      @contract = contract
      @actor = actor
    end

    def call
      return already_sent if contract.provider_document_id.present?
      return school_signer_not_configured unless contract.school.signs_contracts?

      signers = contract.signers
      return no_guardians if signers.empty?

      invalid = signers.reject { |guardian| guardian.email.present? && guardian.cpf.present? }
      return missing_signer_details(invalid) if invalid.any?

      rendered = render(signers)
      return rendered if rendered.failure?

      dispatch(rendered.data, signers)
    end

    private

    attr_reader :contract, :actor

    # A school that has written its own agreement sends that; one that has not still gets the
    # built-in PDF, so contracts keep going out while the template is being set up.
    def render(signers)
      if contract.school.contract_template.present?
        FillTemplateService.call(contract: contract, guardians: signers)
      else
        RenderContractPdfService.call(contract: contract)
      end
    end

    def dispatch(rendered, signers)
      config = Gateways::Signature::Registry.active_config(school: contract.school)
      adapter = Gateways::Signature::Registry.resolve(school: contract.school, config: config)

      document = adapter.create_document(build_request(rendered, signers))

      contract.update!(
        signature_provider: config.provider,
        provider_document_id: document.provider_document_id,
        signature_status: "pending_signature",
        signature_requested_at: Time.current,
        sent_at: Time.current
      )

      ResponseService.success(data: { contract: contract, signer_links: document.signer_links })
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

    # The school is a party to its own contracts, not a bystander copied on them: it signs under
    # the CNPJ it is registered with, at the address holding its signature e-mail — `call` refuses
    # to send a contract before that is configured, so this always has something to build from.
    def school_signer
      school = contract.school

      Gateways::Signature::ValueObjects::Signer.new(
        name: school.name,
        email: school.signature_email,
        cnpj: Cnpj.normalize(school.cnpj)
      )
    end

    def build_request(rendered, signers)
      parties = guardian_signers(rendered, signers) + [ school_signer ]

      Gateways::Signature::ValueObjects::SignatureRequest.new(
        name: "Contrato #{contract.student.name} — #{contract.school.name}",
        # Either the filled HTML or the built-in PDF; the adapter uploads whichever it is given.
        pdf: rendered[:html] || rendered.fetch(:pdf),
        content_type: rendered[:html] ? "text/html" : "application/pdf",
        filename: rendered.fetch(:filename),
        message: I18n.t("signature.contract_message", student: contract.student.name),
        # The school's own copy of every agreement that leaves, configured on the contract
        # template. Anyone already signing is a party and does not need copying as well — the
        # school's address sits on both lists, and it would otherwise receive the document twice.
        copy_emails: contract.school.contract_template&.copy_emails.to_a - parties.map(&:email),
        signers: parties
      )
    end

    def guardian_signers(rendered, signers)
      signers.map do |guardian|
        # The built-in PDF draws each guardian's line, so it knows where their signature goes.
        # An HTML agreement carries no such mark: the page is laid out by the provider when it
        # converts the file, and coordinates measured against our own render would land
        # somewhere arbitrary on theirs. Sending none lets Autentique place it.
        position = rendered[:signature_positions]&.fetch(guardian.id, nil)

        Gateways::Signature::ValueObjects::Signer.new(
          name: guardian.name,
          email: guardian.email,
          cpf: guardian.cpf,
          positions: position ? [ position ] : []
        )
      end
    end

    def already_sent
      failure(:invalid_state_transition, I18n.t("api.errors.contract_already_sent"))
    end

    def school_signer_not_configured
      failure(:validation_error, I18n.t("api.errors.school_signer_not_configured"))
    end

    def no_guardians
      failure(:validation_error, I18n.t("api.errors.contract_without_guardians"))
    end

    # Named, so the school knows which guardian record to complete.
    def missing_signer_details(guardians)
      failure(
        :validation_error,
        I18n.t("api.errors.signer_missing_details", names: guardians.map(&:name).to_sentence)
      )
    end

    def failure(code, message)
      ResponseService.failure(code: code, details: { base: [ message ] })
    end

    def log_failure(error)
      Rails.logger.error(
        {
          event: "signature.send_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          error: error.class.name,
          message: error.message
        }.to_json
      )
    end
  end
end
