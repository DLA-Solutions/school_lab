# frozen_string_literal: true

# A line on a family thread. Sent content is not edited and not deleted: a correction is a
# later message. `kind` routine is the single card a daily routine posts; clients do not send
# that kind themselves.
class Message < ApplicationRecord
  KINDS = %w[text routine].freeze

  belongs_to :conversation
  belongs_to :school
  belongs_to :sender_membership, class_name: "Membership"
  belongs_to :daily_routine, optional: true

  has_many :communication_attachments, dependent: :restrict_with_exception

  validates :kind, inclusion: { in: KINDS }
  validates :sent_at, presence: true
  validates :client_request_id, uniqueness: { scope: :conversation_id }, allow_nil: true
  validates :daily_routine_id, uniqueness: true, allow_nil: true
  validate :school_matches_conversation
  validate :routine_kind_matches_card

  private

  def school_matches_conversation
    return if conversation.blank? || school_id.blank?
    return if conversation.school_id == school_id

    errors.add(:school, :invalid)
  end

  def routine_kind_matches_card
    if kind == "routine"
      errors.add(:daily_routine, :blank) if daily_routine.blank?
    elsif daily_routine.present?
      errors.add(:daily_routine, :present)
    end
  end
end
