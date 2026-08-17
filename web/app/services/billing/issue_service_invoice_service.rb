# frozen_string_literal: true

module Billing
  class IssueServiceInvoiceService < ApplicationService
    def initialize(payment:, adapter: nil)
      @payment = payment
      @adapter = adapter
    end

    def call
      return ResponseService.success(data: existing_invoice) if existing_invoice

      fiscal_settings = payment.school.school_fiscal_setting
      unless fiscal_settings&.enabled?
        return ResponseService.failure(code: :fiscal_configuration_incomplete)
      end

      @invoice = find_or_create_invoice!
      @attempt = find_or_create_pending_attempt!(@invoice)
      request = Gateways::ServiceInvoice::IssueRequestBuilder.from_payment(
        payment,
        idempotency_key: attempt.idempotency_key,
        fiscal_settings: fiscal_settings
      )
      result = adapter.issue(request)
      persist_success!(@invoice, @attempt, result)

      ResponseService.success(data: @invoice.reload)
    rescue Gateways::ServiceInvoice::TransientError
      raise
    rescue Gateways::ServiceInvoice::ValidationError => e
      handle_permanent_failure!(@invoice, @attempt, e)
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue Gateways::ServiceInvoice::Error => e
      handle_permanent_failure!(@invoice, @attempt, e)
      ResponseService.failure(code: :provider_error, details: { message: redact(e) })
    end

    private

    attr_reader :payment, :invoice, :attempt

    def existing_invoice
      @existing_invoice ||= ServiceInvoice.find_by(payment_id: payment.id)
    end

    def adapter
      @adapter ||= Gateways::ServiceInvoice::Registry.resolve(
        school: payment.school,
        provider: provider_config.provider
      )
    end

    def provider_config
      @provider_config ||= Gateways::ServiceInvoice::Registry.active_config(school: payment.school)
    end

    def find_or_create_invoice!
      ServiceInvoice.find_or_create_by!(payment: payment) do |invoice|
        invoice.school = payment.school
        invoice.charge = payment.charge
        invoice.provider = provider_config.provider
        invoice.integration_id = ServiceInvoice.integration_id_for(payment)
      end
    end

    def find_or_create_pending_attempt!(invoice)
      attempt = invoice.current_attempt
      return attempt if attempt&.pending?

      invoice.service_invoice_attempts.create!(
        school: payment.school,
        provider: provider_config.provider,
        idempotency_key: SecureRandom.uuid
      )
    end

    def persist_success!(invoice, attempt, result)
      ActiveRecord::Base.transaction do
        invoice.update!(
          provider_document_id: result.provider_document_id,
          invoice_number: result.invoice_number,
          verification_code: result.verification_code,
          access_key: result.access_key,
          last_error: nil
        )
        attempt.update!(provider_response: { status: result.status })
        attempt.enqueue! if attempt.may_enqueue?
        invoice.enqueue! if invoice.may_enqueue?
      end
    end

    def handle_permanent_failure!(invoice, attempt, error)
      return unless invoice

      invoice.update!(last_error: redact(error)) if invoice.may_mark_failed?
      invoice.mark_failed! if invoice.may_mark_failed?
      return unless attempt&.may_mark_failed?

      attempt.update!(last_error: redact(error))
      attempt.mark_failed!
    end

    def redact(error)
      Billing::PiiRedactor.call(error.message)
    end
  end
end
