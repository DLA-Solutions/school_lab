# frozen_string_literal: true

# What a family wants the school to know about their child's health — an allergy, a medication, a
# condition the staff has to recognise. Written by whoever answers for the student and read by the
# school, so the secretary is not chasing a parent for it on the day it matters.
#
# One per student, not a history: it is a standing note about the child that the family keeps
# current, and a form asking them to re-enter everything each term would go stale instead.
class CreateStudentHealthRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :student_health_records do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      # Free text on purpose. Families describe a child's health in their own words, and a set of
      # fields decided here would be wrong for the one case that mattered.
      t.text :content, null: false, default: ""
      # Who last wrote it. Both the family and the school may keep it current, and a note nobody
      # can attribute is one nobody trusts.
      t.references :updated_by, foreign_key: { to_table: :users }
      t.datetime :content_updated_at

      t.timestamps
    end

    add_index :student_health_records, :student_id, unique: true,
              name: "index_student_health_records_on_student", if_not_exists: true
  end
end
