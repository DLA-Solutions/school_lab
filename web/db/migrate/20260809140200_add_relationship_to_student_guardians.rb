# frozen_string_literal: true

class AddRelationshipToStudentGuardians < ActiveRecord::Migration[8.1]
  def change
    # Which parent this link is. Existing rows predate the question and stay "other" rather than
    # being guessed into a parent they may not be.
    add_column :student_guardians, :relationship, :string, null: false, default: "other"

    add_check_constraint :student_guardians,
                         "relationship IN ('father', 'mother', 'other')",
                         name: "student_guardians_relationship_valid"

    # A student has at most one father link and one mother link; "other" is unbounded.
    add_index :student_guardians,
              %i[student_id relationship],
              unique: true,
              where: "discarded_at IS NULL AND relationship IN ('father', 'mother')",
              name: "index_student_guardians_on_student_and_parent_kept"
  end
end
