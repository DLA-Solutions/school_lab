# frozen_string_literal: true

# A cohort: one grade, taught in one year, under an identifier ("5º ano A / 2026").
class SchoolClass < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  # The grades a school enrols into, in the order they are taught. Stored as these keys; the SPA
  # holds the matching pt-BR labels (`frontend/src/utils/gradeLevels.ts`).
  #
  # Fundamental I covers the 1st to 5th years and Fundamental II the 6th to 9th — the two do not
  # overlap, which is why Fundamental II starts at 6.
  GRADE_LEVELS = [
    *(1..5).map { |year| "infantil_#{year}" },
    *(1..5).map { |year| "fundamental_i_#{year}" },
    *(6..9).map { |year| "fundamental_ii_#{year}" }
  ].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :students, dependent: :nullify
  has_many :teaching_assignments, dependent: :destroy
  has_many :teachers, -> { distinct }, through: :teaching_assignments
  has_many :subjects, -> { distinct }, through: :teaching_assignments

  validates :name, presence: true
  validates :grade_level, presence: true, inclusion: { in: GRADE_LEVELS, allow_blank: true }
  validates :year,
            numericality: { only_integer: true, greater_than_or_equal_to: 2000, less_than_or_equal_to: 2100 }
  validates :name, uniqueness: { scope: %i[school_id year grade_level], conditions: -> { kept } }, if: :kept?

  scope :for_year, ->(year) { where(year: year) }
end
