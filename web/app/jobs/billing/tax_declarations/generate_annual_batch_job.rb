# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class GenerateAnnualBatchJob < ApplicationJob
      queue_as :default

      def perform(school_id:, calendar_year:)
        school = School.kept.find(school_id)
        return unless CalendarYear.closed?(school: school, calendar_year: calendar_year)

        payer_ids = candidate_guardian_ids(school: school, calendar_year: calendar_year)
        payer_ids.each do |guardian_id|
          guardian = school.guardians.kept.find_by(id: guardian_id)
          next if guardian.blank?

          result = EnsureGeneratedService.call(
            school: school,
            guardian: guardian,
            calendar_year: calendar_year
          )
          next if result.success?

          EventEmitter.tax_declaration_generation_failed(
            school_id: school.id,
            guardian_id: guardian.id,
            calendar_year: calendar_year,
            code: result.error_code
          )
        end
      end

      private

      def candidate_guardian_ids(school:, calendar_year:)
        start_at, end_at = CalendarYear.bounds(school: school, calendar_year: calendar_year)

        Payment.joins(:charge)
               .where(school_id: school.id, status: "confirmed")
               .where(paid_at: start_at..end_at)
               .where(charges: { tax_declaration_eligible: true, discarded_at: nil })
               .distinct
               .pluck("charges.guardian_id")
      end
    end
  end
end
