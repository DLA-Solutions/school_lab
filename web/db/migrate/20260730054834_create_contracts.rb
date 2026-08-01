# frozen_string_literal: true

class CreateContracts < ActiveRecord::Migration[8.1]
  def change
    create_table :contracts do |t|
      t.references :student, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :billing_plan, null: false, foreign_key: true
      t.integer :negotiated_amount_cents
      t.integer :due_day
      t.date :starts_on
      t.date :ends_on
      t.string :status, null: false, default: "active"
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :contracts, %i[school_id status]

    add_check_constraint :contracts,
                         "negotiated_amount_cents IS NULL OR negotiated_amount_cents >= 0",
                         name: "contracts_negotiated_amount_cents_non_negative"
  end
end
