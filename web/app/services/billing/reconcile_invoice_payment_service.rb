# frozen_string_literal: true

module Billing
  class ReconcileInvoicePaymentService < ApplicationService
    def initialize(webhook_event:, adapter: nil)
      @webhook_event = webhook_event
      @adapter = adapter
    end

    def call
      return ResponseService.success(data: :already_processed) if webhook_event.processed_at?

      issuance = resolve_issuance
      unless issuance
        complete_event!(observed_status: "not_found", error: "issuance_not_found")
        return ResponseService.failure(code: :not_found)
      end

      invoice = adapter.fetch_invoice(provider_invoice_id: issuance.provider_invoice_id)
      backfill_presentation_fields!(issuance, invoice)
      result = ReconcilePaidInvoiceService.call(charge: issuance.charge, invoice: invoice)
      return result if result.failure?

      complete_event!(observed_status: invoice.status)
      result
    rescue Gateways::BankSlip::TransientError
      raise
    rescue Gateways::BankSlip::ValidationError, Gateways::BankSlip::ProviderError => e
      complete_event!(observed_status: "error", error: redact_error(e))
      ResponseService.failure(code: :provider_error, details: { message: redact_error(e) })
    end

    private

    attr_reader :webhook_event

    # Closes the loop on Inter's asynchronous issuance when a webhook beats the follow-up job
    # (Billing::SyncIssuancePresentationJob): independent of payment status, and a no-op for
    # providers whose issuance already carries these fields.
    def backfill_presentation_fields!(issuance, invoice)
      Billing::BackfillIssuancePresentationService.call(issuance: issuance, invoice: invoice)
    end

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(
        school: webhook_event.school,
        provider: webhook_event.provider
      )
    end

    def resolve_issuance
      return nil if webhook_event.provider_resource_id.blank?

      ChargeIssuance.find_by(
        provider_invoice_id: webhook_event.provider_resource_id,
        school_id: webhook_event.school_id
      )
    end

    def complete_event!(observed_status:, error: nil)
      webhook_event.update!(
        observed_status: observed_status,
        processing_error: error,
        processed_at: Time.current
      )
    end

    def redact_error(error)
      Billing::PiiRedactor.call(error.message)
    end
  end
end
