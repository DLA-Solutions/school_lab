# frozen_string_literal: true

class CreateContracts < ActiveRecord::Migration[8.1]
  def change
    create_table :contracts do |t|
      t.references :student, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :billing_plan, null: false, foreign_key: true
      t.decimal :negotiated_amount, precision: 12, scale: 2
      t.integer :due_day
      t.date :starts_on
      t.date :ends_on
      t.string :status, null: false, default: "active"
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :contracts, %i[school_id status]
  end
end
