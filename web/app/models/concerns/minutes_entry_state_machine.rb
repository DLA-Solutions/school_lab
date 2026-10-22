# frozen_string_literal: true

# Lifecycle of a Livro Ata entry (BR-LA05): written as a draft, sent for signature, signed.
# `cancelled` is reachable from a draft or a pending entry only — a signed ata is a record and is
# immutable. Only services call the events (rule `state-machines`).
module MinutesEntryStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :draft, initial: true
      state :pending_signature
      state :signed
      state :cancelled

      event :request_signature do
        transitions from: :draft, to: :pending_signature
      end

      event :mark_signed do
        transitions from: :pending_signature, to: :signed
      end

      event :cancel do
        transitions from: %i[draft pending_signature], to: :cancelled
      end
    end
  end
end
