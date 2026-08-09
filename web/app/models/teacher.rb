# frozen_string_literal: true

class Teacher < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :teaching_assignments, dependent: :destroy
  has_many :school_classes, -> { distinct }, through: :teaching_assignments
  has_many :subjects, -> { distinct }, through: :teaching_assignments

  before_validation :normalize_cpf

  validates :name, presence: true
  validates :cpf, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validate :cpf_is_a_valid_document
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  def formatted_cpf
    Cpf.format(cpf)
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
end
