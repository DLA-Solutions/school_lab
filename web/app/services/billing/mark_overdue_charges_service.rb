# frozen_string_literal: true

module Billing
  class MarkOverdueChargesService < ApplicationService
    def self.grace_cutoff_for(school:, as_of: Date.current)
      SchoolSettings.for(school).overdue_grace_cutoff(as_of: as_of)
    end

    def initialize(school: nil, as_of: Date.current)
      @school = school
      @as_of = as_of
    end

    def call
      updated = []

      scope.find_each do |charge|
        next unless charge.may_mark_overdue?

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

    attr_reader :school, :as_of

    def scope
      charges = Charge.kept.pending.where("due_date < ?", as_of)
      charges = charges.where(school_id: school.id) if school
      charges
    end
  end
end
