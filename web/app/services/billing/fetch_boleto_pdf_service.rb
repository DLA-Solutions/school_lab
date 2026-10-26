# frozen_string_literal: true

module Billing
  # Fetches the boleto PDF of a charge's current issuance from the provider, for providers that
  # only serve it through an authenticated API (Banco Inter; `capabilities.boleto_pdf`).
  #
  # Authorization (the guardian owns the charge) already ran in the controller. The PDF is never
  # stored here — it carries the payer's name, CPF and address (see docs/open-questions.md).
  #
  # Failure codes (API status):
  # - `:boleto_pdf_unavailable` (409) — charge not payable, no registered boleto yet, the
  #   provider serves no PDF, or the school's active provider is no longer the issuing one;
  # - `:boleto_pdf_provider_unavailable` (503) — transient provider/connection failure, retry;
  # - `:boleto_pdf_provider_error` (502) — the provider rejected or sent something unusable.
  class FetchBoletoPdfService < ApplicationService
    BoletoPdf = Data.define(:content, :filename)

    def initialize(charge:, adapter: nil)
      @charge = charge
      @adapter = adapter
    end

    def call
      return ResponseService.failure(code: :boleto_pdf_unavailable) unless servable?

      issuance = charge.current_issuance
      content = adapter_for(issuance).boleto_pdf(provider_invoice_id: issuance.provider_invoice_id)

      ResponseService.success(data: BoletoPdf.new(content: content, filename: "boleto-#{charge.id}.pdf"))
    rescue Gateways::BankSlip::TransientError => e
      log_failure(:boleto_pdf_provider_unavailable, e)
      ResponseService.failure(code: :boleto_pdf_provider_unavailable)
    rescue Gateways::BankSlip::Error => e
      log_failure(:boleto_pdf_provider_error, e)
      ResponseService.failure(code: :boleto_pdf_provider_error)
    end

    private

    attr_reader :charge

    def servable?
      charge.boleto_pdf_available? && issuing_provider_is_active?
    end

    # The adapter builds its client from the school's *active* credentials; if the school moved to
    # another bank after this boleto was issued, those credentials cannot fetch it.
    def issuing_provider_is_active?
      return true if @adapter

      Gateways::BankSlip::Registry.active_config(school: charge.school).provider == charge.current_issuance.provider
    rescue Gateways::BankSlip::Registry::UnknownProviderError
      false
    end

    def adapter_for(issuance)
      @adapter || Gateways::BankSlip::Registry.resolve(school: charge.school, provider: issuance.provider)
    end

    def log_failure(code, error)
      Rails.logger.error(
        {
          event: "billing.fetch_boleto_pdf.failure",
          school_id: charge.school_id,
          charge_id: charge.id,
          error_code: code,
          error_class: error.class.name,
          message: Billing::PiiRedactor.call(error.message)
        }.to_json
      )
    end
  end
end
