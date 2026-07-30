# frozen_string_literal: true

module DocumentStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :approved
      state :rejected

      event :approve do
        transitions from: :pending, to: :approved
      end

      event :reject do
        transitions from: :pending, to: :rejected
      end
    end
  end
end
