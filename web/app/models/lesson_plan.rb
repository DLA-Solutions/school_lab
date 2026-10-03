# frozen_string_literal: true

# A teacher's free-text plan for one class_discipline (which already fixes school, school class,
# subject, and assigned teacher — curriculum BC5) on one calendar date (BR-LP01). No status, no
# submission/approval workflow (BR-LP05) — saving is immediate and visible. One row per
# (class_discipline_id, date); submitting again for the same pair updates it in place (BR-LP04).
class LessonPlan < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :class_discipline

  validates :date, presence: true
  validates :date, uniqueness: { scope: :class_discipline_id }
  validates :content, presence: true

  before_validation :sync_school_from_class_discipline

  private

  def sync_school_from_class_discipline
    self.school = class_discipline.school if class_discipline.present?
  end
end
