# frozen_string_literal: true

# A collaborator of the school. Named `Teacher` because teaching assignments hang off it, but the
# register covers every post — `job_title` says which.
#
# Distinct from `StaffProfile`, which grants a *user account* a role: a collaborator here is a
# person on file and needs no login.
class Teacher < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PersonSearchable

  belongs_to :school
  belongs_to :job_position
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :teaching_assignments, dependent: :destroy
  has_many :school_classes, -> { distinct }, through: :teaching_assignments
  has_many :subjects, -> { distinct }, through: :teaching_assignments
  has_many :documents, as: :documentable, dependent: :destroy
  # Where their salary is sent. One standing record, not a history — the school pays into the
  # account that is current.
  has_one :bank_account, class_name: "TeacherBankAccount", dependent: :destroy
  # Stable self-reported health facts (BC6) — one standing record, not a history. Mirrors
  # Student#health_profile.
  has_one :health_profile, class_name: "TeacherHealthProfile", dependent: :destroy

  ADDRESS_FIELDS = %i[zip_code street number complement neighborhood city state].freeze

  before_validation :normalize_cpf
  before_validation :normalize_zip_code
  before_validation :normalize_state

  validates :name, presence: true
  validates :cpf, presence: true
  # Optional, unlike a guardian's. A school putting its existing staff on file has an e-mail for
  # some of them and not for others, and a register that refused the rest would simply not be
  # filled in — the CPF is what identifies a collaborator here, not the address they answer at.
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  # The address is kept for the same reasons the guardian's is — a contract, a payroll
  # registration — but none of it is required, for the same reason the e-mail is not.
  validates :state, format: { with: /\A[A-Z]{2}\z/, allow_blank: true }
  validates :zip_code, format: { with: /\A\d{8}\z/, allow_blank: true }
  validate :cpf_is_a_valid_document
  validate :hired_on_is_not_in_the_future
  validate :job_position_belongs_to_the_same_school
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  def formatted_cpf
    Cpf.format(cpf)
  end

  # The post's name, kept on the collaborator's payload so a listing reads without a join.
  def job_title
    job_position&.name
  end

  private

  def normalize_cpf
    self.cpf = Cpf.normalize(cpf)
  end

  def normalize_zip_code
    self.zip_code = zip_code.to_s.gsub(/\D/, "").presence if zip_code.present?
  end

  def normalize_state
    self.state = state.to_s.strip.upcase.presence if state.present?
  end

  def cpf_is_a_valid_document
    return if cpf.blank?
    return if Cpf.valid?(cpf)

    errors.add(:cpf, :invalid_cpf)
  end

  def job_position_belongs_to_the_same_school
    return if job_position.blank? || school_id.blank?
    return if job_position.school_id == school_id

    errors.add(:job_position, :invalid)
  end

  # An engagement that has not started yet cannot have started in the future by mistake.
  def hired_on_is_not_in_the_future
    return if hired_on.blank?
    return if hired_on <= Date.current

    errors.add(:hired_on, :must_not_be_in_the_future)
  end
end
