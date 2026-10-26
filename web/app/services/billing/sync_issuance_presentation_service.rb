# frozen_string_literal: true

module Billing
  # Bounded follow-up to an asynchronous issuance (Banco Inter): re-reads the invoice from the
  # provider and backfills the boleto/Pix presentation fields on the ChargeIssuance, instead of
  # waiting for a webhook that Inter only sends on a status change (payment, cancellation) —
  # not when the boleto becomes ready.
  #
  # Idempotent and safe to repeat. Returns:
  # - success `:synced`               — digitable line and Pix are both on the issuance now;
  # - success `:not_applicable`       — issuance is not issued / has no provider id;
  # - failure `:presentation_pending` — the provider has not produced them yet (job retries).
  # Provider failures follow the port: TransientError propagates (job retry), the others return
  # failure `:provider_error`.
  class SyncIssuancePresentationService < ApplicationService
    # What the guardian needs: the linha digitavel and the Pix copy-and-paste.
    def self.presentation_complete?(issuance)
      issuance.digitable_line.present? && issuance.pix_emv.present?
    end

    def initialize(issuance:, adapter: nil)
      @issuance = issuance
      @adapter = adapter
    end

    def call
      return ResponseService.success(data: :not_applicable) unless fetchable?
      return ResponseService.success(data: :synced) if complete?

      invoice = adapter.fetch_invoice(provider_invoice_id: issuance.provider_invoice_id)
      Billing::BackfillIssuancePresentationService.call(issuance: issuance, invoice: invoice)

      complete? ? ResponseService.success(data: :synced) : ResponseService.failure(code: :presentation_pending)
    rescue Gateways::BankSlip::TransientError
      raise
    rescue Gateways::BankSlip::Error => e
      ResponseService.failure(code: :provider_error, details: { message: Billing::PiiRedactor.call(e.message) })
    end

    private

    attr_reader :issuance

    def fetchable?
      issuance.issued? && issuance.provider_invoice_id.present?
    end

    def complete?
      self.class.presentation_complete?(issuance)
    end

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(school: issuance.school, provider: issuance.provider)
    end
  end
end
