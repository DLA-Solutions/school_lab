# frozen_string_literal: true

module ChargeIssuanceStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: { issued: :issued_at, cancelled: :cancelled_at },
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :issued
      state :failed
      state :cancelled

      event :issue do
        transitions from: :pending, to: :issued
      end

      event :mark_failed do
        transitions from: :pending, to: :failed
      end

      event :cancel do
        transitions from: %i[pending issued], to: :cancelled
      end
    end
  end
end
