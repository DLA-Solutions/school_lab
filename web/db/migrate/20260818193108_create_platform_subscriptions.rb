# frozen_string_literal: true

class CreatePlatformSubscriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :platform_subscriptions do |t|
      t.references :school, null: false, foreign_key: true, index: false
      t.references :platform_plan, null: false, foreign_key: true
      t.string :status, null: false, default: "active"
      t.datetime :trial_ends_at
      t.datetime :current_period_end
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :platform_subscriptions, :school_id, unique: true, where: "discarded_at IS NULL"
    add_index :platform_subscriptions, :status
  end
end
