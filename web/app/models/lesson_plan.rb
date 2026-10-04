# frozen_string_literal: true

# A teacher's structured plan for one class_discipline (which already fixes school, school class,
# subject, and assigned teacher — curriculum BC5) on one calendar date (BR-LP01). No status, no
# submission/approval workflow (BR-LP05) — saving is immediate and visible. One row per
# (class_discipline_id, date); submitting again for the same pair updates it in place (BR-LP04).
# The body follows the school's printed template (BR-LP07) — every template field is optional; the
# only required attributes are the ones that resolve the (class_discipline, date) key.
class LessonPlan < ApplicationRecord
  include SchoolAuditable

  ASSESSMENT_TYPES = %w[diagnostic formative summative].freeze
  ASSESSMENT_FORMATS = %w[
    observation exercises participation written_production oral_presentation practical_activity test
  ].freeze

  belongs_to :school
  belongs_to :class_discipline

  validates :date, presence: true
  validates :date, uniqueness: { scope: :class_discipline_id }
  validate :assessment_types_within_allowed_list
  validate :assessment_formats_within_allowed_list

  before_validation :sync_school_from_class_discipline

  private

  def sync_school_from_class_discipline
    self.school = class_discipline.school if class_discipline.present?
  end

  # `inclusion` on an array attribute checks the whole array against `in:`, not each element —
  # so a partially-valid array (e.g. ["formative", "bogus"]) would pass it silently. These two
  # validations check each element individually against BR-LP07's allowed lists.
  def assessment_types_within_allowed_list
    invalid = Array(assessment_types) - ASSESSMENT_TYPES
    errors.add(:assessment_types, :inclusion, value: invalid.join(", ")) if invalid.any?
  end

  def assessment_formats_within_allowed_list
    invalid = Array(assessment_formats) - ASSESSMENT_FORMATS
    errors.add(:assessment_formats, :inclusion, value: invalid.join(", ")) if invalid.any?
  end
end
