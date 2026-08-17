# frozen_string_literal: true

# What the family wants the school to know about a child's health — an allergy, a medication, a
# condition the staff has to recognise on the day it matters.
#
# One standing note per student rather than a history: the family keeps it current, and a form
# that asked them to re-enter everything each term would go stale instead.
class StudentHealthRecord < ApplicationRecord
  MAX_CONTENT_LENGTH = 5_000

  belongs_to :school
  belongs_to :student
  belongs_to :updated_by, class_name: "User", optional: true

  validates :student_id, uniqueness: true
  validates :content, length: { maximum: MAX_CONTENT_LENGTH }

  # Blank until somebody fills it in, which is the state the school most needs to see: an empty
  # sheet is a family that has not been asked yet, not a child with nothing to report.
  def filled?
    content.present?
  end

  # Records who wrote it alongside the text. A note nobody can attribute is one nobody trusts —
  # the secretary has to know whether the allergy came from the mother or from the front desk.
  def write!(content, actor:)
    update!(
      content: content.to_s.strip,
      updated_by: actor,
      content_updated_at: Time.current
    )
  end
end
