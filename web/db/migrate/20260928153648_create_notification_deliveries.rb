# frozen_string_literal: true

class CreateNotificationDeliveries < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_deliveries do |t|
      t.references :school, null: false, foreign_key: true
      t.references :notification_intent, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :channel, null: false
      t.string :status, null: false, default: "queued"
      t.integer :attempts, null: false, default: 0
      t.datetime :sent_at
      t.string :error_code

      t.timestamps
    end

    add_index :notification_deliveries, %i[notification_intent_id channel user_id],
              unique: true,
              name: "index_notification_deliveries_on_intent_channel_user"
  end
end
