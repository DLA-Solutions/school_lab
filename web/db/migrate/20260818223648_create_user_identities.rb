# frozen_string_literal: true

class CreateUserIdentities < ActiveRecord::Migration[8.1]
  def change
    create_table :user_identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_uid, null: false
      t.string :email, null: false
      t.boolean :email_verified, null: false, default: false
      t.datetime :linked_at, null: false
      t.datetime :last_used_at

      t.timestamps null: false
    end

    add_index :user_identities, %i[provider provider_uid], unique: true
    add_index :user_identities, %i[user_id provider], unique: true
  end
end
