# frozen_string_literal: true

class CreateSchoolInstructionalDays < ActiveRecord::Migration[8.1]
  def change
    create_table :school_instructional_days do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_year, null: false, foreign_key: true
      t.date :date, null: false
      t.boolean :instructional, null: false

      t.timestamps
    end

    add_index :school_instructional_days,
              %i[school_year_id date],
              unique: true,
              name: "index_school_instructional_days_on_year_date"
  end
end
