# frozen_string_literal: true

# A cohort is identified by the time of day it is taught as well as by its letter: "5º ano A"
# in the morning and "5º ano A" in the afternoon are two different groups of students, so the
# shift has to join the uniqueness key rather than sit beside it.
class AddShiftToSchoolClasses < ActiveRecord::Migration[8.1]
  def change
    # Existing rows predate the distinction. Morning is the common case in Brazilian schools, so
    # backfilling to `matutino` keeps them valid; the default stays on the column because the form
    # always sends one and a row with no shift could not be told apart from its counterpart.
    add_column :school_classes, :shift, :string, null: false, default: "matutino"

    # Most schools only ever open one group per grade and shift, and that group is called "A".
    # Defaulting the letter means the form can leave it alone in the common case.
    change_column_default :school_classes, :name, from: nil, to: "A"

    add_check_constraint :school_classes,
                         "shift IN ('matutino', 'vespertino')",
                         name: "school_classes_shift_allowed"

    remove_index :school_classes,
                 column: %i[school_id year grade_level name],
                 name: "index_school_classes_on_school_year_grade_name_kept",
                 unique: true,
                 where: "(discarded_at IS NULL)"

    add_index :school_classes,
              %i[school_id year grade_level shift name],
              name: "index_school_classes_on_school_year_grade_shift_name_kept",
              unique: true,
              where: "discarded_at IS NULL"
  end
end
