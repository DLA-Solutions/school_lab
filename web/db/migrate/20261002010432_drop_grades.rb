class DropGrades < ActiveRecord::Migration[8.1]
  def change
    drop_table :grades do |t|
      t.bigint "academic_period_id", null: false
      t.datetime "created_at", null: false
      t.datetime "discarded_at"
      t.text "note"
      t.bigint "recorded_by_id"
      t.bigint "school_class_id", null: false
      t.bigint "school_id", null: false
      t.decimal "score", precision: 5, scale: 2
      t.bigint "student_id", null: false
      t.bigint "subject_id", null: false
      t.datetime "updated_at", null: false
      t.index ["academic_period_id"], name: "index_grades_on_academic_period_id"
      t.index ["recorded_by_id"], name: "index_grades_on_recorded_by_id"
      t.index ["school_class_id"], name: "index_grades_on_school_class_id"
      t.index ["school_id"], name: "index_grades_on_school_id"
      t.index ["student_id", "subject_id", "academic_period_id"], name: "index_grades_on_student_subject_period_kept", unique: true, where: "(discarded_at IS NULL)"
      t.index ["student_id"], name: "index_grades_on_student_id"
      t.index ["subject_id"], name: "index_grades_on_subject_id"
      t.check_constraint "score IS NULL OR score >= 0::numeric AND score <= 10::numeric", name: "grades_score_range"

      t.foreign_key "academic_periods", column: "academic_period_id"
      t.foreign_key "school_classes", column: "school_class_id"
      t.foreign_key "schools", column: "school_id"
      t.foreign_key "students", column: "student_id"
      t.foreign_key "subjects", column: "subject_id"
      t.foreign_key "users", column: "recorded_by_id"
    end
  end
end
