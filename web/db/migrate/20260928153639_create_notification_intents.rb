# frozen_string_literal: true

class CreateNotificationIntents < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_intents do |t|
      t.references :school, null: false, foreign_key: true
      t.string :channel_key, null: false
      t.string :source_type, null: false
      # Polymorphic-style event source (ReportCardSnapshot, Message, Announcement, …) — no
      # single target table, so no DB foreign_key here (matches schema.dbml: no Ref: for this
      # column).
      t.integer :source_id, null: false
      t.jsonb :payload, null: false, default: {}

      t.timestamps
    end

    add_index :notification_intents, %i[source_type source_id channel_key],
              unique: true,
              name: "index_notification_intents_on_source_and_channel"
  end
end
