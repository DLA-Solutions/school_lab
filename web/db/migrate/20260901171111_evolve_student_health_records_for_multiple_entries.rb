# frozen_string_literal: true

# Evolve health records from one standing note per student to many titled entries with optional
# PDF attachments, plus a separate structured health profile per student (DLA-11).
class EvolveStudentHealthRecordsForMultipleEntries < ActiveRecord::Migration[8.1]
  DEFAULT_RECORD_TITLE = "Health information"

  def up
    remove_index :student_health_records, name: "index_student_health_records_on_student"

    change_table :student_health_records, bulk: true do |t|
      t.string :title, null: false, default: ""
      t.datetime :discarded_at
      t.references :created_by, foreign_key: { to_table: :users }
    end

    execute <<~SQL.squish
      UPDATE student_health_records
      SET title = '#{DEFAULT_RECORD_TITLE}'
      WHERE content <> ''
    SQL

    execute <<~SQL.squish
      DELETE FROM student_health_records
      WHERE content = '' AND title = ''
    SQL

    create_table :student_health_profiles do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.string :blood_type
      t.string :health_plan_name, limit: 120
      t.string :health_plan_number, limit: 60
      t.string :emergency_contact_name, limit: 120
      t.string :emergency_contact_phone, limit: 30
      t.text :special_care_notes

      t.timestamps
    end

    add_index :student_health_profiles, :student_id, unique: true,
              name: "index_student_health_profiles_on_student"
  end

  def down
    drop_table :student_health_profiles

    change_table :student_health_records, bulk: true do |t|
      t.remove_references :created_by, foreign_key: { to_table: :users }
      t.remove :discarded_at
      t.remove :title
    end

    add_index :student_health_records, :student_id, unique: true,
              name: "index_student_health_records_on_student"
  end
end
