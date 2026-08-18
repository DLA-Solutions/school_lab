# frozen_string_literal: true

module Billing
  class DailyFiscalReconciliationService < ApplicationService
    LOOKBACK_DAYS = 14

    def initialize(school:)
      @school = school
    end

    def call
      return ResponseService.success(data: []) unless school.school_fiscal_setting&.enabled?

      since = LOOKBACK_DAYS.days.ago
      invoices = school.service_invoices.where(status: %w[pending enqueued]).where("created_at >= ?", since)
      reconciled = invoices.filter_map do |invoice|
        result = ReconcileFiscalDocumentService.call(service_invoice: invoice)
        result.success? ? result.data : nil
      end

      ResponseService.success(data: reconciled)
    end

    private

    attr_reader :school
  end
end
