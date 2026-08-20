# frozen_string_literal: true

class RenameIuguToAsaasPlatformBilling < ActiveRecord::Migration[8.1]
  TABLES = {
    platform_plan_provider_prices: :provider,
    platform_subscriptions: :provider,
    platform_invoices: :provider,
    platform_billing_settings: :active_provider,
    webhook_events: :provider
  }.freeze

  def up
    TABLES.each do |table, column|
      execute <<~SQL.squish
        UPDATE #{table}
        SET #{column} = 'asaas'
        WHERE #{column} = 'iugu'
      SQL
    end
  end

  def down
    TABLES.each do |table, column|
      execute <<~SQL.squish
        UPDATE #{table}
        SET #{column} = 'iugu'
        WHERE #{column} = 'asaas'
      SQL
    end
  end
end
