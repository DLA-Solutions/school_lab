# frozen_string_literal: true

# A teacher's daily routine note (BC11, "Rotina Infantil") for one student on one calendar date:
# snack, diaper/bathroom counts, and free-text notes (BR-DR03). One row per (student_id, date);
# upserting again for the same pair updates it in place (BR-DR01), same shape as LessonPlan.
#
# `status` is a plain draft/sent flag (BR-DR04) — not an AASM machine, since there are only two
# states and a single one-way transition. Mirrors SchoolYear::STATUSES exactly.
class DailyRoutineEntry < ApplicationRecord
  include SchoolAuditable

  STATUSES = %w[draft sent].freeze

  belongs_to :school
  belongs_to :student
  belongs_to :sent_by_membership, class_name: "Membership", optional: true
  belongs_to :recorded_by_membership, class_name: "Membership", optional: true

  validates :date, presence: true
  validates :date, uniqueness: { scope: :student_id }
  validates :status, inclusion: { in: STATUSES }
  validates :poop_count, :pee_count,
            presence: true,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  validate :student_belongs_to_the_same_school

  def draft?
    status == "draft"
  end

  def sent?
    status == "sent"
  end

  private

  def student_belongs_to_the_same_school
    return if student.blank? || school.blank?
    return if student.school_id == school.id

    errors.add(:student, :invalid)
  end
end
