# frozen_string_literal: true

class Student < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PersonSearchable

  attr_accessor :provisioning_import

  STATUSES = %w[active transferred].freeze

  belongs_to :school
  belongs_to :school_class, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  has_many :guardians, through: :student_guardians
  has_many :contracts, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy
  has_many :grades, dependent: :destroy

  before_validation :normalize_cpf

  validates :name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :birth_date, presence: true
  # RG is optional: not every family has one to hand at enrolment, and the document a school
  # actually identifies a student by is the CPF. Contracts that interpolate `{{aluno.rg}}` render
  # it blank when it is missing.

  # A student is enrolled into a cohort; the grade comes from it. `optional: true` on the
  # association keeps a legacy row loadable, but no new student can be saved without one.
  validates :school_class, presence: true
  validate :school_class_belongs_to_the_same_school

  validates :cpf, presence: true, unless: :provisioning_import
  validate :cpf_is_a_valid_document, if: -> { cpf.present? }
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  validate :birth_date_is_in_the_past

  def formatted_cpf
    Cpf.format(cpf)
  end

  # Still attending: on the roll and not transferred out. The two ways a student stops attending
  # — being removed and being transferred — mean the same thing to anyone reading a listing, and
  # to the rule that keeps guardians in step with their children.
  def enrolled?
    kept? && status == "active"
  end

  # A place at the school is held by a signed contract, not by a row in the register. "In force"
  # is measured against the cohort's own year rather than today's: a school working ahead on next
  # year's enrolment is looking at that year's contracts, and the listing follows the class the
  # child is in.
  def contract_active?(year = school_class&.year || Date.current.year)
    contracts.kept.signed.any? { |contract| contract_in_force?(contract, year) }
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

  # A contract covers a year when it started on or before its end and has not been ended before it
  # began. `ends_on` is absent on an open-ended agreement, which covers everything after its start.
  def contract_in_force?(contract, year)
    return false if contract.starts_on.present? && contract.starts_on.year > year
    return false if contract.status == "ended" && contract.updated_at.year < year

    true
  end

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
