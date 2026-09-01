# frozen_string_literal: true

# What the family wants the school to know about a child's health — an allergy, a medication, a
# condition the staff has to recognise on the day it matters. Families keep several records over
# time rather than one standing note that gets overwritten.
class StudentHealthRecord < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  DOCUMENT_CONTENT_TYPES = %w[application/pdf].freeze
  MAX_DOCUMENT_BYTES = 10.megabytes
  MAX_TITLE_LENGTH = 120
  MAX_CONTENT_LENGTH = 5_000
  DEFAULT_TITLE = "Health information"

  belongs_to :school
  belongs_to :student
  belongs_to :created_by, class_name: "User", optional: true
  belongs_to :updated_by, class_name: "User", optional: true

  has_one_attached :document

  validates :title, presence: true, length: { maximum: MAX_TITLE_LENGTH }
  validates :content, length: { maximum: MAX_CONTENT_LENGTH }
  validate :student_belongs_to_school
  validate :document_is_a_pdf

  scope :for_student, ->(student_id) { kept.where(student_id: student_id).order(updated_at: :desc) }

  def filled?
    content.present? || document.attached?
  end

  private

  def student_belongs_to_school
    return if student.blank? || school_id.blank?

    errors.add(:student, :invalid) unless student.school_id == school_id
  end

  def document_is_a_pdf
    return unless document.attached?

    errors.add(:document, :invalid) unless DOCUMENT_CONTENT_TYPES.include?(document.content_type)
    errors.add(:document, :too_large) if document.byte_size > MAX_DOCUMENT_BYTES
  end
end
