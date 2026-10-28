# frozen_string_literal: true

module Billing
  class DailyReconciliationService < ApplicationService
    RECONCILIATION_WINDOW_DAYS = 14
    LIST_INVOICES_LIMIT = 100

    def initialize(config:, adapter: nil, as_of: Date.current)
      @config = config
      @adapter = adapter
      @as_of = as_of
    end

    def call
      reconciled = 0
      adapter.list_invoices(since: window_start, limit: LIST_INVOICES_LIMIT).each do |invoice|
        next unless invoice.status == "paid"

        issuance = ChargeIssuance.find_by(
          provider_invoice_id: invoice.provider_invoice_id,
          school_id: config.school_id
        )
        charge = issuance&.charge
        # A migrated charge (source: migrated) has no ChargeIssuance row at all — it bypassed
        # our issuance flow entirely — so fall back to matching it by external_reference, the
        # same bank invoice id, so it still gets ongoing paid/overdue status updates from the
        # normal daily reconciliation run.
        charge ||= Charge.kept.migrated.find_by(school_id: config.school_id, external_reference: invoice.provider_invoice_id)
        next unless charge

        result = ReconcilePaidInvoiceService.call(charge: charge, invoice: invoice)
        reconciled += 1 if result.success? && result.data != :not_paid
      end

      unissued = UnissuedCharges.for(config.school)

      ResponseService.success(data: {
                                school_id: config.school_id,
                                reconciled_count: reconciled,
                                unissued: unissued
                              })
    end

    private

    attr_reader :config, :as_of

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(
        school: config.school,
        provider: config.provider
      )
    end

    def window_start
      as_of - RECONCILIATION_WINDOW_DAYS.days
    end
  end
end
