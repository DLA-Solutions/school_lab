# frozen_string_literal: true

class CreateBillingPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :billing_plans do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name
      t.string :plan_type
      t.integer :base_amount_cents
      t.datetime :discarded_at

      t.timestamps
    end

    add_check_constraint :billing_plans,
                         "base_amount_cents IS NULL OR base_amount_cents >= 0",
                         name: "billing_plans_base_amount_cents_non_negative"
  end
end
