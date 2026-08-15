# frozen_string_literal: true

# "A" and "a" are the same cohort, and so are "A" and " A ". The index compared the stored string
# byte for byte, so either spelling opened a second cohort alongside the first — two rolls for one
# group of children, and a contract that could name the wrong one.
class MakeSchoolClassNamesCaseInsensitive < ActiveRecord::Migration[8.1]
  def up
    # Fold what is already stored before the stricter index is built, or it cannot be created.
    execute(<<~SQL)
      UPDATE school_classes
         SET name = upper(btrim(regexp_replace(name, '\\s+', ' ', 'g')))
       WHERE name <> upper(btrim(regexp_replace(name, '\\s+', ' ', 'g')))
    SQL

    remove_index :school_classes,
                 name: "index_school_classes_on_school_year_grade_shift_name_kept"

    add_index :school_classes,
              "school_id, year, grade_level, shift, lower(name)",
              name: "index_school_classes_on_school_year_grade_shift_name_kept",
              unique: true,
              where: "discarded_at IS NULL"
  end

  def down
    remove_index :school_classes,
                 name: "index_school_classes_on_school_year_grade_shift_name_kept"

    add_index :school_classes,
              %i[school_id year grade_level shift name],
              name: "index_school_classes_on_school_year_grade_shift_name_kept",
              unique: true,
              where: "discarded_at IS NULL"
  end
end
