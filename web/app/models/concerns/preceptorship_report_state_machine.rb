# frozen_string_literal: true

# A preceptoria report is written, then published.
#
# There is no way back. Once a family has read what a teacher wrote about their child, unpublishing
# it does not unread it — and a school that could quietly withdraw an account of a student has a
# record nobody can rely on. A published report that was wrong is corrected by publishing another,
# which is also how it would be done on paper.
module PreceptorshipReportStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :draft, initial: true
      state :published

      event :publish do
        transitions from: :draft, to: :published
      end
    end
  end
end
