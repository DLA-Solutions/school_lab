# frozen_string_literal: true

module ServiceInvoiceStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: {
           enqueued: :enqueued_at,
           authorized: :authorized_at,
           rejected: :rejected_at,
           failed: :failed_at,
           canceled: :canceled_at
         },
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :enqueued
      state :authorized
      state :rejected
      state :failed
      state :canceled

      event :enqueue do
        transitions from: :pending, to: :enqueued
      end

      event :authorize do
        transitions from: %i[pending enqueued], to: :authorized
      end

      event :reject do
        transitions from: %i[pending enqueued], to: :rejected
      end

      event :mark_failed do
        transitions from: %i[pending enqueued], to: :failed
      end

      event :cancel do
        transitions from: :authorized, to: :canceled
      end
    end
  end
end
