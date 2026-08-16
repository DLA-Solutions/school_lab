# frozen_string_literal: true

# One student's mark in one subject for one period of the school year.
#
# The grid a teacher fills in is students down, periods across, for one class and one subject. A
# row here is one cell of that grid, and the uniqueness rule is what makes re-entering a cell a
# correction rather than a second mark.
class Grade < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  # What Brazilian schools mark on. A school that grades by concept rather than by number would
  # need its own scale; nothing here assumes one exists yet.
  MIN_SCORE = 0
  MAX_SCORE = 10

  belongs_to :school
  belongs_to :student
  belongs_to :subject
  belongs_to :school_class
  belongs_to :academic_period
  belongs_to :recorded_by, class_name: "User", optional: true

  # Nullable on purpose: the grid saves each cell as it is edited, so clearing a mistyped mark has
  # to be storable. A row with no score is "not given yet", which is not the same as a zero.
  validates :score,
            numericality: {
              greater_than_or_equal_to: MIN_SCORE,
              less_than_or_equal_to: MAX_SCORE
            },
            allow_nil: true

  validates :student_id,
            uniqueness: { scope: %i[subject_id academic_period_id], conditions: -> { kept } },
            if: :kept?

  validate :parties_belong_to_the_same_school
  validate :period_accepts_marks

  scope :for_period, ->(period) { where(academic_period: period) }

  private

  # Every association is school-scoped on its own; this stops a request from stitching together
  # records that belong to different schools.
  def parties_belong_to_the_same_school
    return if school_id.blank?

    {
      student: student, subject: subject, school_class: school_class,
      academic_period: academic_period
    }.each do |name, record|
      next if record.blank? || record.school_id == school_id

      errors.add(name, :invalid)
    end
  end

  # A closed period is the school's record of what was awarded; reopening it is a decision for
  # whoever closed it, not a side effect of someone typing in the grid. Applies to a first mark as
  # much as to a correction — scoping this to updates let the very first mark through, since a
  # cell nobody had marked yet had no row to update.
  def period_accepts_marks
    return if academic_period.blank?
    return unless academic_period.closure_status == "closed"

    errors.add(:academic_period, :closed)
  end
end
