# frozen_string_literal: true

module Billing
  module UnissuedCharges
    module_function

    def for(school, due_within: 7.days)
      cutoff = Date.current + due_within
      charges = Charge.kept
                      .open
                      .where(school_id: school.id)
                      .where(due_date: ..cutoff)
                      .includes(:charge_issuances)

      never_attempted = []
      permanently_failed = []

      charges.find_each do |charge|
        issuances = charge.charge_issuances
        if issuances.empty?
          never_attempted << charge
        elsif issuances.none? { |row| row.status == "issued" } && issuances.any? { |row| row.status == "failed" }
          permanently_failed << charge
        end
      end

      { never_attempted: never_attempted, permanently_failed: permanently_failed }
    end
  end
end
