# frozen_string_literal: true

# Reference state machine for charges — matches docs/api/v1/fintech-first.md.
# Include in Charge when the model lands. Transitions are invoked from services.
module ChargeStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :paid
      state :overdue
      state :cancelled

      event :pay do
        transitions from: %i[pending overdue], to: :paid
      end

      event :mark_overdue do
        transitions from: :pending, to: :overdue
      end

      event :cancel do
        transitions from: %i[pending overdue], to: :cancelled
      end
    end
  end
end
