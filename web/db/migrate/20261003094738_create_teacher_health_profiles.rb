# frozen_string_literal: true

# BC6 collaborator health profile — one row per teacher, mirrors student_health_profiles
# field-for-field but scoped to a Teacher instead of a Student.
class CreateTeacherHealthProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :teacher_health_profiles do |t|
      t.references :school, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: true
      t.string :blood_type
      t.string :health_plan_name, limit: 120
      t.string :health_plan_number, limit: 60
      t.string :emergency_contact_name, limit: 120
      t.string :emergency_contact_phone, limit: 30
      t.text :special_care_notes

      t.timestamps
    end

    add_index :teacher_health_profiles, :teacher_id, unique: true,
              name: "index_teacher_health_profiles_on_teacher"
  end
end
