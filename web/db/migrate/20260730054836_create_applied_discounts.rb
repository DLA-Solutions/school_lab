# frozen_string_literal: true

class CreateAppliedDiscounts < ActiveRecord::Migration[8.1]
  def change
    create_table :applied_discounts do |t|
      t.references :charge, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :discount_type
      t.integer :amount_cents
      t.datetime :discarded_at

      t.timestamps
    end

    add_check_constraint :applied_discounts,
                         "amount_cents IS NULL OR amount_cents >= 0",
                         name: "applied_discounts_amount_cents_non_negative"
  end
end
