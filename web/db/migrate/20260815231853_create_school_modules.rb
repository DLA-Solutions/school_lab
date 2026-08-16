# frozen_string_literal: true

class CreateSchoolModules < ActiveRecord::Migration[8.1]
  def change
    create_table :school_modules do |t|
      t.references :school, null: false, foreign_key: true
      t.string :module_key, null: false
      t.boolean :enabled, null: false, default: true

      t.timestamps
    end

    add_index :school_modules, %i[school_id module_key], unique: true
  end
end
