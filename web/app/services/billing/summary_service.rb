# frozen_string_literal: true

module Billing
  class SummaryService < ApplicationService
    def initialize(school:)
      @school = school
    end

    def call
      charges = school.charges.kept
      payments = school.payments.joins(:charge).merge(Charge.kept)

      open_charges = charges.where(status: "pending")
      overdue_charges = charges.where(status: "overdue")
      paid_this_month = payments.where(paid_at: Time.current.all_month)

      expected = charges.where(status: %w[pending overdue], due_date: Date.current.all_month)

      ResponseService.success(
        data: {
          open_count: open_charges.count,
          overdue_count: overdue_charges.count,
          paid_this_month_count: paid_this_month.count,
          open_amount_cents: open_charges.sum(:total_amount_cents),
          overdue_amount_cents: overdue_charges.sum(:total_amount_cents),
          expected_collection_this_month_cents: expected.sum(:total_amount_cents)
        }
      )
    end

    private

    attr_reader :school
  end
end
