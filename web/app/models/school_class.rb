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

  # When the cohort is taught. Two groups with the same letter in the same grade and year are
  # told apart by this, so it is part of what makes a cohort unique rather than a label on it.
  SHIFTS = %w[matutino vespertino].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :students, dependent: :nullify
  has_many :teaching_assignments, dependent: :destroy
  has_many :teachers, -> { distinct }, through: :teaching_assignments
  has_many :subjects, -> { distinct }, through: :teaching_assignments
  has_many :class_disciplines, dependent: :destroy
  has_many :evaluation_templates, dependent: :destroy
  has_many :grade_launches, dependent: :destroy
  has_many :attendance_sessions, dependent: :destroy

  # "A", "a" and " A " all name the same cohort. Folded on the way in so the register holds one
  # spelling, and compared case-insensitively so the older spellings cannot slip past either.
  before_validation :normalize_name

  validates :name, presence: true
  validates :grade_level, presence: true, inclusion: { in: GRADE_LEVELS, allow_blank: true }
  validates :shift, presence: true, inclusion: { in: SHIFTS, allow_blank: true }
  validates :year,
            numericality: { only_integer: true, greater_than_or_equal_to: 2000, less_than_or_equal_to: 2100 }
  validates :name,
            uniqueness: {
              scope: %i[school_id year grade_level shift],
              conditions: -> { kept },
              case_sensitive: false
            },
            if: :kept?

  scope :for_year, ->(year) { where(year: year) }
  scope :for_shift, ->(shift) { where(shift: shift) }
  scope :for_grade_level, ->(grade) { where(grade_level: grade) }

  # By the cohort's own letter. Names are folded on the way in, so the term is folded to match —
  # someone typing "a" is looking for the cohort stored as "A".
  scope :search, lambda { |term|
    next all if term.blank?

    where("school_classes.name ILIKE ?", "%#{sanitize_sql_like(term.to_s.strip)}%")
  }

  # Deleting a cohort nullifies the `school_class_id` of everyone in it, and a student without one
  # fails their own validation — the roll would be gone and the children left unattached. A cohort
  # that has emptied out can go; one with students has to be emptied first.
  def deletable?
    students.kept.empty?
  end

  ROMAN = %w[I II III IV V].freeze

  # The pt-BR wording for each stored grade key, alongside the segment it belongs to. Mirrors
  # `frontend/app/src/utils/gradeLevels.ts` — the SPA labels its own selects, but a contract is
  # rendered server-side and cannot reach for those.
  GRADE_LABELS = {
    **(1..5).to_h { |n| [ "infantil_#{n}", [ "Educação Infantil", "Infantil #{ROMAN[n - 1]}" ] ] },
    **(1..5).to_h { |n| [ "fundamental_i_#{n}", [ "Ensino Fundamental I", "#{n}º ano" ] ] },
    **(6..9).to_h { |n| [ "fundamental_ii_#{n}", [ "Ensino Fundamental II", "#{n}º ano" ] ] }
  }.freeze

  SHIFT_LABELS = { "matutino" => "Matutino", "vespertino" => "Vespertino" }.freeze

  # "Ensino Fundamental I — 5º ano" for a stored `fundamental_i_5`.
  def grade_label
    segment, grade = GRADE_LABELS[grade_level]
    return grade_level.to_s if segment.blank?

    "#{segment} — #{grade}"
  end

  def shift_label
    SHIFT_LABELS.fetch(shift, shift.to_s)
  end

  # Where the cohort sits in the curriculum, for anything that has to read in teaching order:
  # Infantil I through V, then Fundamental I, then Fundamental II. A grade key that predates the
  # list sorts last rather than first, so an unrecognised cohort is visible at the end of a report
  # instead of silently heading it.
  def curricular_position
    GRADE_LEVELS.index(grade_level) || GRADE_LEVELS.size
  end

  # Everything that names the cohort: "Ensino Fundamental I — 5º ano A · Matutino — 2026".
  #
  # The letter alone identifies nothing — it repeats in every grade, and now in both shifts — so
  # anywhere a cohort is named to a person it is named in full. Matches what the SPA's selects
  # show, so a contract and the screen it was filled in from read the same.
  def full_name
    "#{grade_label} #{name} · #{shift_label} — #{year}"
  end

  private

  def normalize_name
    self.name = name.to_s.squish.upcase.presence
  end
end
