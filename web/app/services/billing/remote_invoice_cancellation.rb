# frozen_string_literal: true

module Billing
  class RemoteInvoiceCancellation
    def initialize(charge:, adapter: nil)
      @charge = charge
      @adapter = adapter
    end

    def call
      issuance = charge.current_issuance
      return ResponseService.success unless issuance&.issued?

      unless adapter.capabilities.cancellation
        issuance.update!(last_error: "remote cancellation unsupported for provider #{issuance.provider}")
        return ResponseService.success
      end

      adapter.cancel(provider_invoice_id: issuance.provider_invoice_id)
      issuance.cancel! if issuance.may_cancel?
      charge.clear_invoice_cache!
      ResponseService.success
    rescue Gateways::BankSlip::ValidationError, Gateways::BankSlip::ProviderError => e
      ResponseService.failure(code: :provider_rejected, details: { message: redact_error(e) })
    rescue Gateways::BankSlip::TransientError => e
      ResponseService.failure(code: :provider_unavailable, details: { message: redact_error(e) })
    end

    private

    attr_reader :charge

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(school: charge.school, provider: provider_name)
    end

    # Only reached after #call returns early for a charge without an issued issuance, so the
    # provider is always the persisted one — there is nothing to fall back to.
    def provider_name
      charge.current_issuance.provider
    end

    def redact_error(error)
      Billing::PiiRedactor.call(error.message)
    end
  end
end
