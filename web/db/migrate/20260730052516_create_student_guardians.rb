# frozen_string_literal: true

class CreateStudentGuardians < ActiveRecord::Migration[8.1]
  def change
    create_table :student_guardians do |t|
      t.references :guardian, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.decimal :financial_percentage
      t.boolean :primary_guardian
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :student_guardians, %i[guardian_id student_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_student_guardians_on_guardian_id_and_student_id_kept"
  end
end
