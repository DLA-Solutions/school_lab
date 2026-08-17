# frozen_string_literal: true

class CreateTaxDeclarations < ActiveRecord::Migration[8.1]
  def change
    create_table :tax_declarations do |t|
      t.references :school, null: false, foreign_key: true
      t.references :guardian, null: false, foreign_key: true
      t.integer :calendar_year, null: false
      t.bigint :active_version_id

      t.timestamps
    end

    add_index :tax_declarations,
              %i[school_id guardian_id calendar_year],
              unique: true,
              name: "index_tax_declarations_on_school_guardian_year"
  end
end
