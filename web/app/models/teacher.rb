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

  before_validation :normalize_cpf

  validates :name, presence: true
  validates :cpf, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
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
