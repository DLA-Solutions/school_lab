# frozen_string_literal: true

# One-time backfill for BR-IN11: incidents created before incident_guardians existed have zero
# snapshot rows. This fills each from that incident's student's *current* student_guardians, at
# migration time, so already-recorded atas are not left without guardian names (AC-IN08). The
# INNER JOINs mean an incident whose student currently has zero kept student_guardians rows simply
# contributes no INSERT rows — not an error, not a blank row (BR-IN11/AC-IN08 "just skip").
class BackfillIncidentGuardiansFromStudentGuardians < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      INSERT INTO incident_guardians (incident_id, guardian_id, name, relationship, created_at, updated_at)
      SELECT i.id, sg.guardian_id, g.name, sg.relationship, NOW(), NOW()
      FROM incidents i
      JOIN student_guardians sg ON sg.student_id = i.student_id AND sg.discarded_at IS NULL
      JOIN guardians g ON g.id = sg.guardian_id
    SQL
  end

  def down
    # One-time backfill, not reversible by design (same rationale as migration 20260901171111):
    # by the time anyone would run `down`, real incident_guardians rows created through the normal
    # save path are indistinguishable from backfilled ones, so there is nothing safe to delete back
    # out.
  end
end
