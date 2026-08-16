# frozen_string_literal: true

# Preceptoria: what a teacher has to say about one student, in prose.
#
# Not a mark. The mark sheet answers "how did they do in maths"; this answers "how are they
# getting on", which is the thing a family actually asks at a parents' evening and the thing no
# column of numbers holds. So the body is free text and there is no scale: the moment this grows
# a rating it stops being what a teacher would have written and becomes another grade.
#
# Written as a draft and published deliberately. A teacher works on a paragraph about somebody's
# child over several sittings, and a family reading the half-written middle of that is worse than
# a family waiting a week for the finished thing.
class CreatePreceptorshipReports < ActiveRecord::Migration[8.1]
  def change
    create_table :preceptorship_reports do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      # Whose account of the student this is. Named rather than inferred from the author's user:
      # the report is signed by a teacher, and it stays signed by them if a coordinator later
      # types it up from their notes.
      t.references :teacher, null: false, foreign_key: true
      # Which term it covers. Optional: a school that writes these to no calendar of its own
      # should not be forced to invent one.
      t.references :academic_period, foreign_key: true
      t.references :author, foreign_key: { to_table: :users }

      t.text :body, null: false
      t.string :status, null: false, default: "draft"
      t.datetime :published_at

      t.datetime :discarded_at
      t.timestamps
    end

    # What a teacher's own list and a guardian's list both read.
    add_index :preceptorship_reports, %i[school_id student_id created_at]
    add_index :preceptorship_reports, %i[school_id status]

    add_check_constraint :preceptorship_reports,
                         "status IN ('draft', 'published')",
                         name: "preceptorship_reports_status"
  end
end
