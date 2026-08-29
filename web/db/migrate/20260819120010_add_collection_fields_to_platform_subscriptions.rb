# frozen_string_literal: true

class AddCollectionFieldsToPlatformSubscriptions < ActiveRecord::Migration[8.1]
  def change
    change_table :platform_subscriptions, bulk: true do |t|
      t.string :billing_interval
      t.string :provider, null: false, default: "manual"
      t.string :external_customer_id
      t.string :external_subscription_id
      t.datetime :current_period_start
      t.boolean :cancel_at_period_end, null: false, default: false
      t.datetime :canceled_at
      t.string :collection_method, null: false, default: "manual"
    end

    add_index :platform_subscriptions, :provider
    add_index :platform_subscriptions, %i[provider external_subscription_id],
              unique: true,
              where: "external_subscription_id IS NOT NULL",
              name: "index_platform_subscriptions_on_provider_and_external_id"

    reversible do |dir|
      dir.up do
        execute(<<~SQL.squish)
          UPDATE platform_subscriptions
          SET status = 'trialing'
          WHERE status = 'trial'
        SQL
        execute(<<~SQL.squish)
          UPDATE platform_subscriptions
          SET billing_interval = 'month'
          WHERE billing_interval IS NULL
        SQL
      end
    end
  end
end
