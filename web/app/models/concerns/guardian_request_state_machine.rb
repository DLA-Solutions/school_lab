# frozen_string_literal: true

# The life of a request as the secretary works it: it arrives, someone picks it up, and it ends
# either met or refused.
#
# `in_progress` exists because the queue is shared. Two people at the same desk both seeing a
# pending request will both start on it, and the school finds out when the guardian is telephoned
# twice. Picking it up is a claim, and it is worth a state of its own.
#
# Refusing straight from `pending` is allowed: a request the school cannot meet at all does not
# need to be claimed first.
module GuardianRequestStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :in_progress
      state :fulfilled
      state :rejected

      event :start do
        transitions from: :pending, to: :in_progress
      end

      # Back to the queue when whoever claimed it cannot finish — otherwise a request held by
      # someone on holiday looks like it is being dealt with.
      event :release do
        transitions from: :in_progress, to: :pending
      end

      event :fulfill do
        transitions from: %i[pending in_progress], to: :fulfilled
      end

      event :reject do
        transitions from: %i[pending in_progress], to: :rejected
      end
    end
  end
end
