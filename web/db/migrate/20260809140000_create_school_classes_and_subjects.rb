# frozen_string_literal: true

# A turma is a real cohort — a grade taught in a given year under an identifier ("5º ano A / 2026")
# — rather than the loose grade string students carried until now.
class CreateSchoolClassesAndSubjects < ActiveRecord::Migration[8.1]
  def change
    create_table :school_classes do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :grade_level, null: false
      t.integer :year, null: false
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    # One "5º ano A" per year per school; a discarded cohort frees the name again.
    add_index :school_classes,
              %i[school_id year grade_level name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_school_classes_on_school_year_grade_name_kept"

    create_table :subjects do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :subjects,
              %i[school_id name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_subjects_on_school_id_and_name_kept"

    create_table :teachers do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :cpf, limit: 11
      t.string :email
      t.string :phone
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :teachers,
              %i[school_id cpf],
              unique: true,
              where: "discarded_at IS NULL AND cpf IS NOT NULL",
              name: "index_teachers_on_school_id_and_cpf_kept"

    add_check_constraint :teachers, "cpf IS NULL OR cpf ~ '^[0-9]{11}$'", name: "teachers_cpf_format"

    # One row per "this teacher teaches this subject to this class". A teacher has many classes,
    # and within a class may hold more than one subject.
    create_table :teaching_assignments do |t|
      t.references :school, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :teaching_assignments,
              %i[teacher_id school_class_id subject_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_teaching_assignments_unique_kept"
  end
end
