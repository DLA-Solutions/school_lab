# frozen_string_literal: true

module Billing
  class ReissueChargeService < ApplicationService
    REISSUE_DUE_DATE_OFFSET_DAYS = 7

    def initialize(charge:, adapter: nil, new_due_date: nil)
      @charge = charge
      @adapter = adapter
      @new_due_date = new_due_date
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless charge.pending? || charge.overdue?

      if adapter.capabilities.past_due_reissue
        reissue_in_place!
      else
        reissue_by_cancel_and_create!
      end
    end

    private

    attr_reader :charge, :new_due_date

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(school: charge.school, provider: provider_name)
    end

    def provider_name
      charge.current_issuance&.provider || Gateways::BankSlip::Registry.default_provider
    end

    def reissue_in_place!
      charge.update!(due_date: target_due_date)
      issuance = charge.current_issuance
      request = Gateways::BankSlip::IssueRequestBuilder.from_charge(
        charge,
        idempotency_key: issuance.idempotency_key
      )
      result = adapter.issue(request)
      persist_issuance!(issuance, result)
      ResponseService.success(data: charge.reload)
    end

    def reissue_by_cancel_and_create!
      remote_result = RemoteInvoiceCancellation.new(charge: charge, adapter: adapter).call
      return remote_result if remote_result.failure?

      if invoice_settled_after_cancel?
        return ResponseService.failure(code: :provider_rejected, details: { message: "invoice settled during reissue" })
      end

      charge.update!(due_date: target_due_date)
      IssueChargeService.call(charge: charge, adapter: adapter)
    end

    def invoice_settled_after_cancel?
      issuance = charge.charge_issuances.where(status: "cancelled").order(created_at: :desc).first
      return false unless issuance&.provider_invoice_id

      adapter.fetch_invoice(provider_invoice_id: issuance.provider_invoice_id).status == "paid"
    rescue Gateways::BankSlip::ProviderError
      false
    end

    def target_due_date
      new_due_date || default_due_date
    end

    def default_due_date
      Billing::SchoolTimezone.today_for(charge.school) + REISSUE_DUE_DATE_OFFSET_DAYS
    end

    def persist_issuance!(issuance, result)
      ActiveRecord::Base.transaction do
        issuance.update!(
          due_date: charge.due_date,
          amount_cents: charge.total_amount_cents,
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
  end
end
