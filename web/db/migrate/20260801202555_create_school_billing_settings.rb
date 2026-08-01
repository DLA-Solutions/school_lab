# frozen_string_literal: true

class CreateSchoolBillingSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :school_billing_settings do |t|
      t.references :school, null: false, foreign_key: true, index: { unique: true }
      t.integer :overdue_grace_days, null: false, default: 3
      t.string :service_description, limit: 100
      t.jsonb :notification_schedule, null: false, default: {}

      t.timestamps
    end

    add_check_constraint :school_billing_settings,
                         "overdue_grace_days >= 0 AND overdue_grace_days <= 30",
                         name: "school_billing_settings_overdue_grace_days_range"
  end
end
