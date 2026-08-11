# frozen_string_literal: true

class CreateCollectionReminderDeliveries < ActiveRecord::Migration[8.1]
  def change
    create_table :collection_reminder_deliveries do |t|
      t.references :school, null: false, foreign_key: true
      t.references :charge, null: false, foreign_key: true
      t.string :rule_key, null: false
      t.date :sent_on, null: false

      t.timestamps
    end

    add_index :collection_reminder_deliveries,
              %i[charge_id rule_key sent_on],
              unique: true,
              name: "index_collection_reminder_deliveries_on_charge_rule_sent_on"
    add_index :collection_reminder_deliveries, %i[school_id sent_on]
  end
end
