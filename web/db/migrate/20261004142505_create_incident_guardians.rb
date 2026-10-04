# frozen_string_literal: true

# Snapshot of the guardians recorded on an incident ("ata") at save time (BR-IN11). guardian_id is
# nullable and nullifies (not cascades) on guardian destroy, so a later guardian deletion does not
# take the historical ata row down with it; name and relationship are denormalized copies taken at
# save time and never follow later changes to the guardian or to the student's student_guardians
# links — the ata must keep showing the names it showed on the day it was recorded.
class CreateIncidentGuardians < ActiveRecord::Migration[8.1]
  def change
    create_table :incident_guardians do |t|
      t.references :incident, null: false, foreign_key: true
      t.references :guardian, foreign_key: { on_delete: :nullify }
      t.string :name, null: false
      t.string :relationship, null: false

      t.timestamps
    end
  end
end
