# frozen_string_literal: true

module ServiceInvoiceAttemptStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: { enqueued: :enqueued_at, failed: :failed_at },
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :enqueued
      state :failed

      event :enqueue do
        transitions from: :pending, to: :enqueued
      end

      event :mark_failed do
        transitions from: %i[pending enqueued], to: :failed
      end
    end
  end
end
