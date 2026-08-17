# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class BuildLineItemsService < ApplicationService
      LineItem = Data.define(
        :payment,
        :charge,
        :student,
        :billing_purpose_code,
        :paid_at,
        :source_paid_amount_cents,
        :source_fine_amount_cents,
        :source_interest_amount_cents,
        :declared_principal_amount_cents
      )

      def initialize(school:, guardian:, calendar_year:)
        @school = school
        @guardian = guardian
        @calendar_year = calendar_year
      end

      def call
        legacy = legacy_payments.exists?
        return ResponseService.failure(code: :unclassified_legacy_charge) if legacy

        lines = eligible_payments.filter_map { |payment| build_line(payment) }
        return ResponseService.failure(code: :no_eligible_payments) if lines.empty?

        ResponseService.success(data: lines)
      end

      private

      attr_reader :school, :guardian, :calendar_year

      def year_bounds
        @year_bounds ||= CalendarYear.bounds(school: school, calendar_year: calendar_year)
      end

      def payer_payments_in_year
        start_at, end_at = year_bounds

        Payment.joins(:charge)
               .where(school_id: school.id, status: "confirmed")
               .where(paid_at: start_at..end_at)
               .where(charges: { guardian_id: guardian.id, discarded_at: nil })
               .includes(charge: { contract: :student })
               .order(:paid_at, :id)
      end

      def legacy_payments
        payer_payments_in_year.where(charges: { billing_purpose_code: nil })
      end

      def eligible_payments
        payer_payments_in_year.where(charges: { tax_declaration_eligible: true })
      end

      def build_line(payment)
        charge = payment.charge
        student = charge.contract&.student
        return if student.blank?

        declared = payment.paid_amount_cents - payment.fine_amount_cents - payment.interest_amount_cents
        return if declared.negative?

        LineItem.new(
          payment: payment,
          charge: charge,
          student: student,
          billing_purpose_code: charge.billing_purpose_code,
          paid_at: payment.paid_at,
          source_paid_amount_cents: payment.paid_amount_cents,
          source_fine_amount_cents: payment.fine_amount_cents,
          source_interest_amount_cents: payment.interest_amount_cents,
          declared_principal_amount_cents: declared
        )
      end
    end
  end
end
