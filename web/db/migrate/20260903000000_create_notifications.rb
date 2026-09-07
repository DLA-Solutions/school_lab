# frozen_string_literal: true

class CreateNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      # Optional: not every notification kind will be about a contract, but this one is, and a
      # cancelled/deleted contract should not take its own past notifications down with it.
      t.references :contract, null: true, foreign_key: true

      t.string :kind, null: false
      t.string :title, null: false
      t.text :body
      t.datetime :read_at

      t.timestamps
    end

    # The topbar bell reads its own unread count and list in recency order — both keyed by user.
    add_index :notifications, %i[user_id read_at]
    add_index :notifications, %i[user_id created_at]
  end
end
