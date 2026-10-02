# frozen_string_literal: true

class CreateNotificationPolicies < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_policies do |t|
      t.references :school, null: false, foreign_key: true
      t.string :channel_key, null: false
      t.boolean :push_enabled, null: false, default: true
      t.boolean :email_enabled, null: false, default: false
      t.boolean :whatsapp_enabled, null: false, default: false

      t.timestamps
    end

    add_index :notification_policies, %i[school_id channel_key], unique: true
  end
end
