# frozen_string_literal: true

class Document < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include DocumentStateMachine

  DOCUMENTABLE_TYPES = %w[School Guardian Student Teacher].freeze
  GUARDIAN_VISIBLE_STATUSES = %w[pending approved].freeze
  # The closed list a guardian picks from in "Meus documentos" (BR-ARC17). Staff keep the wider,
  # free-form `document_type`, so this is enforced by the guardian upload service, not here.
  GUARDIAN_DOCUMENT_TYPES = %w[address_proof vaccination_card medical_report school_transfer other].freeze

  belongs_to :school
  belongs_to :documentable, polymorphic: true
  belongs_to :uploaded_by, class_name: "User", optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_one_attached :file

  validates :document_type, presence: true
  validates :documentable_type, inclusion: { in: DOCUMENTABLE_TYPES }
  validate :documentable_belongs_to_school
  validate :file_attached

  private

  def documentable_belongs_to_school
    return if documentable.blank? || school_id.blank?

    case documentable
    when School
      errors.add(:documentable, :invalid) unless documentable.id == school_id
    when Student, Guardian, Teacher
      errors.add(:documentable, :invalid) unless documentable.school_id == school_id
    else
      errors.add(:documentable, :invalid)
    end
  end

  def file_attached
    errors.add(:file, :blank) unless file.attached?
  end
end
