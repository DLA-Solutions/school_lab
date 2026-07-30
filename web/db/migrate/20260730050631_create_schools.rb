# frozen_string_literal: true

class CreateSchools < ActiveRecord::Migration[8.1]
  def change
    create_table :schools do |t|
      t.references :school_group, foreign_key: true
      t.string :name
      t.string :cnpj
      t.string :address
      t.string :saas_plan
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
