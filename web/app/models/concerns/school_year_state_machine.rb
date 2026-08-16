# frozen_string_literal: true

module SchoolYearStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :draft, initial: true
      state :active
      state :archived

      event :activate do
        transitions from: :draft, to: :active
      end

      event :archive do
        transitions from: :active, to: :archived
      end
    end
  end
end
