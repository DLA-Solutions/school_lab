# frozen_string_literal: true

class CreateWebhookEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :webhook_events do |t|
      t.string :psp_event_id, null: false
      t.string :event_type
      t.text :payload
      t.datetime :processed_at

      t.timestamps
    end

    add_index :webhook_events, :psp_event_id, unique: true
  end
end
