# frozen_string_literal: true

class CreateBillingPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :billing_plans do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name
      t.string :plan_type
      t.decimal :base_amount, precision: 12, scale: 2
      t.datetime :discarded_at

      t.timestamps
    end
  end
end
