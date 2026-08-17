# frozen_string_literal: true

# Somebody the family allows to collect a child at the gate — a grandmother, a driver, an aunt.
#
# The photo matters as much as the name: whoever is at the door has to be recognised by a member
# of staff who has never met them, and a name on a list does not do that.
class AuthorizedPickup < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  PHOTO_CONTENT_TYPES = %w[image/jpeg image/png image/webp image/heic].freeze
  MAX_PHOTO_BYTES = 8.megabytes

  belongs_to :school
  belongs_to :student
  belongs_to :created_by, class_name: "User", optional: true

  has_one_attached :photo

  before_validation :normalize_cpf

  validates :name, presence: true, length: { maximum: 120 }
  validates :cpf, presence: true
  validate :cpf_is_a_valid_document, if: -> { cpf.present? }
  # Withdrawing somebody and authorising them again later is a real case, so only the live rows
  # collide. Mirrors `index_authorized_pickups_on_student_and_cpf_kept`.
  validates :cpf, uniqueness: { scope: :student_id, conditions: -> { kept } }, if: :kept?
  validates :phone, length: { maximum: 30 }, allow_blank: true
  validate :student_belongs_to_school
  validate :photo_is_an_image

  scope :for_student, ->(student_id) { kept.where(student_id: student_id).order(:name) }

  private

  def normalize_cpf
    self.cpf = Cpf.normalize(cpf)
  end

  def cpf_is_a_valid_document
    errors.add(:cpf, :invalid) unless Cpf.valid?(cpf)
  end

  def student_belongs_to_school
    return if student.blank? || school_id.blank?

    errors.add(:student, :invalid) unless student.school_id == school_id
  end

  # A photo nobody can open is worse than none: staff would be at the gate with a broken image.
  def photo_is_an_image
    return unless photo.attached?

    errors.add(:photo, :invalid) unless PHOTO_CONTENT_TYPES.include?(photo.content_type)
    errors.add(:photo, :too_large) if photo.byte_size > MAX_PHOTO_BYTES
  end
end
