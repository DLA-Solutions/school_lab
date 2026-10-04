# frozen_string_literal: true

# An occurrence record (BC7) — the product's "Ata". Deliberately not AASM: the approval gate
# (BR-IN08) is two independent boolean slots converging on one derived status, not a linear
# transition graph, so it is modeled as plain guarded methods instead.
#
# No `discarded_at` — BR-IN05 "no hard delete" is expressed entirely through `status: archived`,
# not through Discard, so the business lifecycle and the soft-delete mechanism are not conflated
# on this table.
class Incident < ApplicationRecord
  include SchoolAuditable

  CATEGORIES = IncidentType::CATEGORIES
  VISIBILITIES = IncidentType::VISIBILITIES
  STATUSES = %w[pending_approval approved archived].freeze
  ROLE_TEMPLATE_APPROVAL_KEYS = %w[coordination director].freeze

  belongs_to :school
  belongs_to :student
  belongs_to :incident_type
  belongs_to :reported_by_membership, class_name: "Membership"
  belongs_to :coordination_approved_by_membership, class_name: "Membership", optional: true
  belongs_to :director_approved_by_membership, class_name: "Membership", optional: true

  has_many_attached :attachments

  validates :category, inclusion: { in: CATEGORIES }
  validates :visibility, inclusion: { in: VISIBILITIES }
  validates :status, inclusion: { in: STATUSES }

  validate :student_belongs_to_school
  validate :incident_type_belongs_to_school

  before_validation :snapshot_from_incident_type, on: :create

  scope :for_student, ->(student_id) { where(student_id: student_id) }
  scope :published, -> { where.not(published_at: nil) }
  scope :guardian_visible, -> { where.not(visibility: "staff_only") }

  def pending_approval?
    status == "pending_approval"
  end

  def approved?
    status == "approved"
  end

  def archived?
    status == "archived"
  end

  def published?
    published_at.present?
  end

  def both_approvals_present?
    coordination_approved_at.present? && director_approved_at.present?
  end

  # Fills the coordination slot (BR-IN08). Re-approving the same slot is a no-op, not an error
  # (AC-IN04) — the first approval's timestamp is the record of truth.
  def approve_coordination!(membership)
    unless coordination_approved_at.present?
      update!(coordination_approved_at: Time.current, coordination_approved_by_membership: membership)
    end
    recompute_status!
  end

  # Fills the director slot (BR-IN08). Same idempotency as #approve_coordination!.
  def approve_director!(membership)
    unless director_approved_at.present?
      update!(director_approved_at: Time.current, director_approved_by_membership: membership)
    end
    recompute_status!
  end

  # Guardian publish (UC-IN02). `staff_only` incidents never publish — the caller (service layer)
  # is expected to have already refused that case; this is a model-level invariant, not the
  # business-rule check itself.
  def publish!
    return if published_at.present?

    update!(published_at: Time.current)
  end

  private

  def recompute_status!
    return unless both_approvals_present?
    return if archived?

    update!(status: "approved")
  end

  # `category`/`severity` are snapshotted from the type at creation time and do not follow later
  # edits to the type row (see docs/modeling/007-academic.md § Incidents) — a report filtered by
  # category must not change meaning retroactively because a school recategorised a type.
  def snapshot_from_incident_type
    return if incident_type.blank?

    self.category ||= incident_type.category
    self.severity ||= incident_type.severity
  end

  def student_belongs_to_school
    return if student.blank? || school_id.blank?

    errors.add(:student, :invalid) unless student.school_id == school_id
  end

  def incident_type_belongs_to_school
    return if incident_type.blank? || school_id.blank?

    errors.add(:incident_type, :invalid) unless incident_type.school_id == school_id
  end
end
