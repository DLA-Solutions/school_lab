# frozen_string_literal: true

class CreatePlatformBillingSettings < ActiveRecord::Migration[8.1]
  def up
    create_table :platform_billing_settings do |t|
      t.string :active_provider, null: false, default: "manual"
      t.string :webhook_endpoint_token, null: false

      t.timestamps
    end

    add_index :platform_billing_settings, :webhook_endpoint_token, unique: true
    add_index :platform_billing_settings, "(TRUE)",
              unique: true,
              name: "index_platform_billing_settings_singleton"

    token = ENV["PLATFORM_BILLING_WEBHOOK_TOKEN"].presence || "dev-platform-billing-webhook-token"
    now = Time.current
    execute(<<~SQL.squish)
      INSERT INTO platform_billing_settings (active_provider, webhook_endpoint_token, created_at, updated_at)
      VALUES ('manual', #{quote(token)}, #{quote(now)}, #{quote(now)})
    SQL
  end

  def down
    drop_table :platform_billing_settings
  end
end
