# frozen_string_literal: true

class AddEnrollmentDetailsToStudents < ActiveRecord::Migration[8.1]
  INDEX_NAME = "index_students_on_school_id_and_cpf_kept"

  def change
    add_column :students, :cpf, :string, limit: 11
    add_column :students, :rg, :string
    add_column :students, :grade_level, :string

    # Same rule as guardians: the CPF identifies one person within a school, stored as bare digits
    # so two spellings of the same document cannot both get in.
    add_index :students,
              %i[school_id cpf],
              unique: true,
              where: "discarded_at IS NULL AND cpf IS NOT NULL",
              name: INDEX_NAME

    add_check_constraint :students,
                         "cpf IS NULL OR cpf ~ '^[0-9]{11}$'",
                         name: "students_cpf_format"
  end
end
