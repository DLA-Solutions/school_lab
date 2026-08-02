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
      stuck_pending = []

      charges.find_each do |charge|
        issuances = charge.charge_issuances
        next if issuances.any? { |row| row.status == "issued" }

        if issuances.empty?
          never_attempted << charge
        elsif issuances.any? { |row| row.status == "failed" }
          permanently_failed << charge
        elsif issuances.any? { |row| row.status == "pending" }
          # Attempted but neither issued nor recorded as failed — without this bucket a
          # crashed or unhandled attempt stays invisible to billing monitoring.
          stuck_pending << charge
        end
      end

      {
        never_attempted: never_attempted,
        permanently_failed: permanently_failed,
        stuck_pending: stuck_pending
      }
    end
  end
end
