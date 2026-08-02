# frozen_string_literal: true

module Billing
  class IssueChargeService < ApplicationService
    def initialize(charge:, adapter: nil)
      @charge = charge
      @adapter = adapter
    end

    def call
      existing = charge.current_issuance
      return ResponseService.success(data: existing) if existing&.issued?

      issuance = find_or_create_pending_issuance!
      request = Gateways::BankSlip::IssueRequestBuilder.from_charge(
        charge,
        idempotency_key: issuance.idempotency_key
      )
      result = adapter.issue(request)
      persist_success!(issuance, result)

      ResponseService.success(data: issuance.reload)
    rescue Gateways::BankSlip::TransientError
      raise
    rescue Gateways::BankSlip::ValidationError => e
      handle_permanent_failure!(charge.current_issuance, e)
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue Gateways::BankSlip::Error => e
      # Authentication (mTLS/token), unmapped provider responses and missing provider
      # configuration are permanent — the same input cannot succeed on retry.
      handle_permanent_failure!(charge.current_issuance, e)
      ResponseService.failure(code: :provider_error, details: { message: redact(e) })
    end

    private

    attr_reader :charge

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(
        school: charge.school,
        provider: provider_config.provider,
        environment: provider_config.environment
      )
    end

    # Raises UnknownProviderError when the school has no active configuration. There is no
    # fallback provider: the fake adapter would report success and hand the guardian a boleto
    # that collects nothing. The rescue in #call records that as a permanent failure.
    def provider_config
      @provider_config ||= Gateways::BankSlip::Registry.active_config(school: charge.school)
    end

    def find_or_create_pending_issuance!
      issuance = charge.current_issuance
      return issuance if issuance&.pending?

      charge.charge_issuances.create!(
        school: charge.school,
        provider: provider_config.provider,
        idempotency_key: SecureRandom.uuid,
        amount_cents: charge.total_amount_cents,
        due_date: charge.due_date
      )
    end

    def persist_success!(issuance, result)
      ActiveRecord::Base.transaction do
        issuance.update!(
          provider_invoice_id: result.provider_invoice_id,
          boleto_url: result.boleto_url,
          digitable_line: result.digitable_line,
          barcode: result.barcode,
          our_number: result.our_number,
          pix_emv: result.pix_emv,
          last_error: nil
        )
        issuance.issue! if issuance.may_issue?
        charge.sync_invoice_cache!
      end
    end

    def handle_permanent_failure!(issuance, error)
      return unless issuance&.may_mark_failed?

      issuance.update!(last_error: redact(error))
      issuance.mark_failed!
    end

    def redact(error)
      Billing::PiiRedactor.call(error.message)
    end
  end
end
