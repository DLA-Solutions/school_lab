# frozen_string_literal: true

# One student's mark in one subject for one period of the school year.
#
# The four together are the unit, and the unique index says so: a teacher entering marks is filling
# a grid of students against periods, and entering the same cell twice means correcting it, not
# recording a second mark.
#
# The mark is nullable on purpose. The grid saves each cell as it is typed, so an empty cell has to
# be storable — a teacher who clears a mark they mistyped must not be left with the old value, and
# a row that exists with no mark is how "not yet given" is told apart from "zero".
class CreateGrades < ActiveRecord::Migration[8.1]
  def change
    create_table :grades do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :academic_period, null: false, foreign_key: true
      # Who entered it, for the audit trail the register keeps on everything else.
      t.references :recorded_by, foreign_key: { to_table: :users }

      t.decimal :score, precision: 5, scale: 2
      t.text :note

      t.datetime :discarded_at
      t.timestamps
    end

    add_index :grades,
              %i[student_id subject_id academic_period_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_grades_on_student_subject_period_kept"

    # The scale is 0 to 10, which is what Brazilian schools mark on. Enforced here as well as in
    # the model: the grid writes a cell per keystroke-settled edit, and a bad value reaching the
    # table would show up later as a boletim nobody can explain.
    add_check_constraint :grades,
                         "score IS NULL OR (score >= 0 AND score <= 10)",
                         name: "grades_score_range"
  end
end
