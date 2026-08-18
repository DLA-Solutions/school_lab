# frozen_string_literal: true

class CreatePlatformPlans < ActiveRecord::Migration[8.1]
  PLANS = [
    { key: "starter", name: "Starter", monthly_amount_cents: 29_900 },
    { key: "pro", name: "Pro", monthly_amount_cents: 59_900 },
    { key: "enterprise", name: "Enterprise", monthly_amount_cents: 99_900 }
  ].freeze

  def change
    create_table :platform_plans do |t|
      t.string :key, null: false
      t.string :name, null: false
      t.integer :monthly_amount_cents, null: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :platform_plans, :key, unique: true, where: "discarded_at IS NULL"

    reversible do |dir|
      dir.up do
        now = Time.current
        PLANS.each do |plan|
          execute <<~SQL.squish
            INSERT INTO platform_plans (key, name, monthly_amount_cents, created_at, updated_at)
            VALUES (#{quote(plan[:key])}, #{quote(plan[:name])}, #{plan[:monthly_amount_cents]}, #{quote(now)}, #{quote(now)})
          SQL
        end
      end
    end
  end
end
