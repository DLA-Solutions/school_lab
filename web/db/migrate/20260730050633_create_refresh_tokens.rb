# frozen_string_literal: true

class CreateRefreshTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :refresh_tokens do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at

      t.datetime :created_at, null: false
    end

    add_index :refresh_tokens, :token_digest, unique: true
  end
end
