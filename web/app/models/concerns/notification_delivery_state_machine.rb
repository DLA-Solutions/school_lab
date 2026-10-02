# frozen_string_literal: true

# Delivery pipeline for one (intent, channel, user) — BR-N04. `queued` is the only state a job may
# act from; `sent`, `failed` and `skipped` are terminal, which is what makes retrying an
# already-resolved delivery a safe no-op (BR-N05, AC-N03).
module NotificationDeliveryStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :queued, initial: true
      state :sent
      state :failed
      state :skipped

      event :deliver do
        transitions from: :queued, to: :sent
      end

      event :fail do
        transitions from: :queued, to: :failed
      end

      # Policy disabled this channel for the school (BR-N04) — the service calls this
      # synchronously right after creating the row; it is never enqueued.
      event :skip do
        transitions from: :queued, to: :skipped
      end
    end
  end
end
