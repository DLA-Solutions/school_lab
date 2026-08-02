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
        next unless issuance

        result = ReconcilePaidInvoiceService.call(charge: issuance.charge, invoice: invoice)
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
