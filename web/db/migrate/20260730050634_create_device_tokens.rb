# frozen_string_literal: true

class CreateDeviceTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :device_tokens do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token, null: false
      t.string :platform, null: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :device_tokens, :token,
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_device_tokens_on_token_kept"
  end
end
