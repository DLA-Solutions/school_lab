# frozen_string_literal: true

module Billing
  class MarkOverdueChargesService < ApplicationService
    def initialize(school: nil, as_of: Date.current)
      @school = school
      @as_of = as_of
    end

    def call
      updated = []

      scope.find_each do |charge|
        next unless charge.may_mark_overdue?

        late_fee = LateFeeCalculator.call(charge: charge)
        total_amount = charge.original_amount - charge.discount_amount + late_fee

        charge.update!(late_fee_amount: late_fee, total_amount: total_amount)
        charge.mark_overdue!
        CollectionReguaNotifier.notify_overdue(charge: charge)
        updated << charge
      end

      ResponseService.success(data: updated)
    end

    private

    attr_reader :school, :as_of

    def scope
      charges = Charge.kept.pending.where("due_date < ?", as_of)
      charges = charges.where(school_id: school.id) if school
      charges
    end
  end
end
