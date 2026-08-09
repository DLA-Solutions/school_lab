# frozen_string_literal: true

class Student < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PersonSearchable

  STATUSES = %w[active transferred].freeze

  belongs_to :school
  belongs_to :school_class, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  has_many :guardians, through: :student_guardians
  has_many :contracts, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy

  before_validation :normalize_cpf

  validates :name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :birth_date, presence: true
  validates :rg, presence: true

  # A student is enrolled into a cohort; the grade comes from it. `optional: true` on the
  # association keeps a legacy row loadable, but no new student can be saved without one.
  validates :school_class, presence: true
  validate :school_class_belongs_to_the_same_school

  validates :cpf, presence: true
  validate :cpf_is_a_valid_document
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  validate :birth_date_is_in_the_past

  def formatted_cpf
    Cpf.format(cpf)
  end

  # Derived from the cohort — students no longer carry a grade of their own.
  def grade_level
    school_class&.grade_level
  end

  def father_link
    student_guardians.kept.find_by(relationship: "father")
  end

  def mother_link
    student_guardians.kept.find_by(relationship: "mother")
  end

  private

  def normalize_cpf
    self.cpf = Cpf.normalize(cpf)
  end

  def cpf_is_a_valid_document
    return if cpf.blank?
    return if Cpf.valid?(cpf)

    errors.add(:cpf, :invalid_cpf)
  end

  def birth_date_is_in_the_past
    return if birth_date.blank?
    return if birth_date < Date.current

    errors.add(:birth_date, :must_be_in_the_past)
  end

  def school_class_belongs_to_the_same_school
    return if school_class.blank? || school_id.blank?
    return if school_class.school_id == school_id

    errors.add(:school_class, :invalid)
  end
end
