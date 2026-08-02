# frozen_string_literal: true

module Billing
  class MarkOverdueChargesService < ApplicationService
    def initialize(school: nil, as_of: nil)
      @school = school
      @as_of = as_of
    end

    def call
      updated = []

      scope.find_each do |charge|
        next unless charge.may_mark_overdue?
        next unless overdue?(charge)

        late_fee_cents = LateFeeCalculator.call(charge: charge)
        total_amount_cents = charge.original_amount_cents - charge.discount_amount_cents + late_fee_cents

        charge.update!(late_fee_amount_cents: late_fee_cents, total_amount_cents: total_amount_cents)
        charge.mark_overdue!
        CollectionReguaNotifier.notify_overdue(charge: charge)
        updated << charge
      end

      ResponseService.success(data: updated)
    end

    private

    attr_reader :school

    def scope
      charges = Charge.kept.pending
      charges = charges.where(school_id: school.id) if school
      charges
    end

    def overdue?(charge)
      settings = SchoolSettings.for(charge.school)
      BusinessDayCalendar.overdue?(
        due_date: charge.due_date,
        grace_days: settings.overdue_grace_days,
        as_of: evaluation_date_for(charge.school)
      )
    end

    def evaluation_date_for(charge_school)
      @as_of || SchoolTimezone.today_for(charge_school)
    end
  end
end
