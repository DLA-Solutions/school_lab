# frozen_string_literal: true

# Stable health facts about a child — blood type, health plan, emergency contact — kept current
# by the family and read by the school. One profile per student, separate from the list of
# condition-specific health records.
class StudentHealthProfile < ApplicationRecord
  include SchoolAuditable

  BLOOD_TYPES = %w[A+ A- B+ B- AB+ AB- O+ O- unknown].freeze
  MAX_HEALTH_PLAN_NAME_LENGTH = 120
  MAX_HEALTH_PLAN_NUMBER_LENGTH = 60
  MAX_EMERGENCY_CONTACT_NAME_LENGTH = 120
  MAX_EMERGENCY_CONTACT_PHONE_LENGTH = 30
  MAX_SPECIAL_CARE_NOTES_LENGTH = 2_000

  belongs_to :school
  belongs_to :student

  before_validation :normalize_emergency_contact_phone

  validates :student_id, uniqueness: true
  validates :blood_type, inclusion: { in: BLOOD_TYPES }, allow_blank: true
  validates :health_plan_name, length: { maximum: MAX_HEALTH_PLAN_NAME_LENGTH }, allow_blank: true
  validates :health_plan_number, length: { maximum: MAX_HEALTH_PLAN_NUMBER_LENGTH }, allow_blank: true
  validates :emergency_contact_name, length: { maximum: MAX_EMERGENCY_CONTACT_NAME_LENGTH },
                                     allow_blank: true
  validates :emergency_contact_phone, length: { maximum: MAX_EMERGENCY_CONTACT_PHONE_LENGTH },
                                      allow_blank: true
  validates :special_care_notes, length: { maximum: MAX_SPECIAL_CARE_NOTES_LENGTH }, allow_blank: true
  validate :student_belongs_to_school

  private

  def normalize_emergency_contact_phone
    self.emergency_contact_phone = emergency_contact_phone.to_s.gsub(/\D/, "") if emergency_contact_phone.present?
  end

  def student_belongs_to_school
    return if student.blank? || school_id.blank?

    errors.add(:student, :invalid) unless student.school_id == school_id
  end
end
