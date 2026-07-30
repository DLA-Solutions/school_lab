# frozen_string_literal: true

class CreateAppliedDiscounts < ActiveRecord::Migration[8.1]
  def change
    create_table :applied_discounts do |t|
      t.references :charge, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :discount_type
      t.decimal :amount, precision: 12, scale: 2
      t.datetime :discarded_at

      t.timestamps
    end
  end
end
