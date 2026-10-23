# frozen_string_literal: true

class Document < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include DocumentStateMachine

  DOCUMENTABLE_TYPES = %w[School Guardian Student Teacher].freeze
  GUARDIAN_VISIBLE_STATUSES = %w[pending approved].freeze
  # The closed list a guardian picks from in "Meus documentos" (BR-ARC17). Staff keep the wider,
  # free-form `document_type`, so this is enforced by the guardian upload service, not here.
  # `guardian_identity` is a scan of the guardians' RG and CPF (identity data, BR-ARC15);
  # `school_transcript` is the child's school history and is distinct from `school_transfer`.
  GUARDIAN_DOCUMENT_TYPES = %w[
    address_proof school_transcript guardian_identity vaccination_card medical_report school_transfer other
  ].freeze
  # Filed by the system, never picked by a guardian or staff: the signed copy of a contract
  # that the e-signature provider returned. Deliberately not in GUARDIAN_DOCUMENT_TYPES.
  SIGNED_CONTRACT_TYPE = "signed_contract"
  # The school's own regulatory files (BC5 "Compliance"): a closed catalog, always attached to the
  # School itself. Labels live under `documents.compliance_types.<key>` in the locale files.
  COMPLIANCE_DOCUMENT_TYPES = %w[
    sanitary_inspection fire_department_certificate municipal_education_council_resolution
    state_education_council_resolution pest_control water_tank_cleaning first_aid_certificate
  ].freeze

  belongs_to :school
  belongs_to :documentable, polymorphic: true
  belongs_to :uploaded_by, class_name: "User", optional: true
  # Only the signed copy of a contract carries this; the DB allows one such document per contract.
  belongs_to :contract, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_one_attached :file

  validates :document_type, presence: true
  validates :documentable_type, inclusion: { in: DOCUMENTABLE_TYPES }
  validates :contract_id, uniqueness: true, allow_nil: true
  validate :contract_belongs_to_school
  validate :documentable_belongs_to_school
  validate :compliance_type_belongs_to_school
  validate :file_attached

  # School-level compliance files: School documentable plus a catalog type. Callers still bind
  # the query to a school (`policy_scope`), as with every tenant query.
  scope :compliance, -> { where(documentable_type: "School", document_type: COMPLIANCE_DOCUMENT_TYPES) }

  # Everything the school holds about one guardian: files attached to the guardian and files
  # attached to a child still linked to them (what a parent sends through "Meus documentos").
  # Both halves are bound to `school_id`, so a guardian id from another school matches nothing.
  scope :about_guardian, lambda { |guardian_id, school_id|
    student_ids = Student.kept
                         .joins(:student_guardians)
                         .merge(StudentGuardian.kept.where(guardian_id: guardian_id, school_id: school_id))
                         .where(school_id: school_id)
                         .select(:id)

    where(school_id: school_id, documentable_type: "Guardian", documentable_id: guardian_id)
      .or(where(school_id: school_id, documentable_type: "Student", documentable_id: student_ids))
  }

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

  # A compliance type on a student's or guardian's file would be a school-level certificate
  # reachable from a family surface; keep the two worlds apart whichever endpoint wrote it.
  def compliance_type_belongs_to_school
    return unless COMPLIANCE_DOCUMENT_TYPES.include?(document_type)

    errors.add(:documentable_type, :invalid) unless documentable_type == "School"
  end

  def contract_belongs_to_school
    return if contract.blank? || school_id.blank?

    errors.add(:contract, :invalid) unless contract.school_id == school_id
  end

  def file_attached
    errors.add(:file, :blank) unless file.attached?
  end
end
