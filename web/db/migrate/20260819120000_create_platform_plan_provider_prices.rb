# frozen_string_literal: true

class CreatePlatformPlanProviderPrices < ActiveRecord::Migration[8.1]
  YEARLY_MULTIPLIER = 12

  def up
    create_table :platform_plan_provider_prices do |t|
      t.references :platform_plan, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :billing_interval, null: false
      t.string :external_product_id
      t.string :external_price_id
      t.integer :amount_cents, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :platform_plan_provider_prices,
              %i[platform_plan_id provider billing_interval],
              unique: true,
              name: "index_platform_plan_prices_on_plan_provider_interval"

    now = Time.current
    PlatformPlan.reset_column_information if defined?(PlatformPlan)

    say_with_time "seed provider prices for starter/pro/enterprise" do
      execute(<<~SQL.squish)
        INSERT INTO platform_plan_provider_prices
          (platform_plan_id, provider, billing_interval, external_price_id, amount_cents, active, created_at, updated_at)
        SELECT id, 'manual', 'month', key || '_monthly', monthly_amount_cents, TRUE, #{quote(now)}, #{quote(now)}
        FROM platform_plans
        WHERE discarded_at IS NULL
      SQL

      execute(<<~SQL.squish)
        INSERT INTO platform_plan_provider_prices
          (platform_plan_id, provider, billing_interval, external_price_id, amount_cents, active, created_at, updated_at)
        SELECT id, 'manual', 'year', key || '_yearly', monthly_amount_cents * #{YEARLY_MULTIPLIER}, TRUE, #{quote(now)}, #{quote(now)}
        FROM platform_plans
        WHERE discarded_at IS NULL
      SQL

      %w[iugu fake].each do |provider|
        execute(<<~SQL.squish)
          INSERT INTO platform_plan_provider_prices
            (platform_plan_id, provider, billing_interval, external_price_id, amount_cents, active, created_at, updated_at)
          SELECT id, #{quote(provider)}, 'month', key || '_monthly', monthly_amount_cents, TRUE, #{quote(now)}, #{quote(now)}
          FROM platform_plans
          WHERE discarded_at IS NULL
        SQL

        execute(<<~SQL.squish)
          INSERT INTO platform_plan_provider_prices
            (platform_plan_id, provider, billing_interval, external_price_id, amount_cents, active, created_at, updated_at)
          SELECT id, #{quote(provider)}, 'year', key || '_yearly', monthly_amount_cents * #{YEARLY_MULTIPLIER}, TRUE, #{quote(now)}, #{quote(now)}
          FROM platform_plans
          WHERE discarded_at IS NULL
        SQL
      end
    end
  end

  def down
    drop_table :platform_plan_provider_prices
  end
end
