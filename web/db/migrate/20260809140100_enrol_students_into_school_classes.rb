# frozen_string_literal: true

# Students carried a loose `grade_level` string. A grade is now a property of the cohort they are
# enrolled into, so the string moves to `school_classes` and the student points at one.
class EnrolStudentsIntoSchoolClasses < ActiveRecord::Migration[8.1]
  def up
    add_reference :students, :school_class, foreign_key: true

    # One cohort per grade already in use, named "A" — the only division that can be inferred from
    # data that never recorded one. Splitting into further cohorts is a school's job afterwards.
    year = Date.current.year
    execute <<~SQL.squish
      INSERT INTO school_classes (school_id, name, grade_level, year, created_at, updated_at)
      SELECT DISTINCT school_id, 'A', grade_level, #{year}, NOW(), NOW()
      FROM students
      WHERE grade_level IS NOT NULL
    SQL

    execute <<~SQL.squish
      UPDATE students
      SET school_class_id = school_classes.id
      FROM school_classes
      WHERE students.grade_level = school_classes.grade_level
        AND students.school_id = school_classes.school_id
        AND school_classes.year = #{year}
        AND school_classes.name = 'A'
    SQL

    remove_column :students, :grade_level
  end

  def down
    add_column :students, :grade_level, :string

    execute <<~SQL.squish
      UPDATE students
      SET grade_level = school_classes.grade_level
      FROM school_classes
      WHERE students.school_class_id = school_classes.id
    SQL

    remove_reference :students, :school_class
  end
end
