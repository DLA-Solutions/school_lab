# frozen_string_literal: true

class DeviseCreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      t.string :reset_password_token
      t.datetime :reset_password_sent_at
      t.datetime :remember_created_at

      t.integer :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string :current_sign_in_ip
      t.string :last_sign_in_ip

      t.string :confirmation_token
      t.datetime :confirmed_at
      t.datetime :confirmation_sent_at
      t.string :unconfirmed_email

      t.integer :failed_attempts, default: 0, null: false
      t.string :unlock_token
      t.datetime :locked_at

      t.string :status, null: false, default: "active"
      t.datetime :disabled_at
      t.references :disabled_by, foreign_key: { to_table: :users }

      t.datetime :discarded_at

      t.timestamps null: false
    end

    add_index :users, :email, unique: true, where: "discarded_at IS NULL", name: "index_users_on_email_kept"
    add_index :users, :reset_password_token, unique: true
    add_index :users, :confirmation_token, unique: true
    add_index :users, :unlock_token, unique: true
  end
end
