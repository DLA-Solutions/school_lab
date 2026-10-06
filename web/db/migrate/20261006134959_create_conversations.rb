# frozen_string_literal: true

# One family chat per child and audience. Coordination and secretary are a single
# row each (teacher_id null). Teacher audience is one row per teacher.
class CreateConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.string :audience, null: false
      t.references :teacher, foreign_key: true
      t.datetime :last_message_at

      t.timestamps
    end

    add_check_constraint :conversations,
                         "audience IN ('coordination', 'secretary', 'teacher')",
                         name: "conversations_audience_valid"
    add_check_constraint :conversations,
                         "(audience = 'teacher') = (teacher_id IS NOT NULL)",
                         name: "conversations_teacher_matches_audience"

    add_index :conversations, %i[school_id student_id audience],
              unique: true,
              where: "teacher_id IS NULL",
              name: "index_conversations_on_school_student_audience_no_teacher"
    add_index :conversations, %i[school_id student_id teacher_id],
              unique: true,
              where: "audience = 'teacher'",
              name: "index_conversations_on_school_student_teacher"
    add_index :conversations, %i[school_id last_message_at]
  end
end
