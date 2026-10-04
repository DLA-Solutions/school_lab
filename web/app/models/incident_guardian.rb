# frozen_string_literal: true

# BR-IN11 — one row per guardian snapshotted onto an incident ("ata") at save time. `name` and
# `relationship` are denormalized copies of the guardian/student_guardians values *as they stood
# when the incident was saved*; they deliberately do not follow later edits to the guardian's own
# record or to the student's `student_guardians` links (the ata is a historical record, not a
# live view — see Incident model and docs/prds/academic/incidents.md § BR-IN11).
#
# `guardian_id` is nullable (DB FK is `on_delete: :nullify`, not cascade) so that destroying a
# guardian later does not delete the historical ata row — only its live link back to that
# guardian.
class IncidentGuardian < ApplicationRecord
  belongs_to :incident
  belongs_to :guardian, optional: true

  validates :name, presence: true
  validates :relationship, presence: true, inclusion: { in: StudentGuardian::RELATIONSHIPS }
end
