# frozen_string_literal: true

class CreateMembershipInviteTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :membership_invite_tokens do |t|
      t.references :membership, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.references :created_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :membership_invite_tokens, :token_digest, unique: true
    add_index :membership_invite_tokens, :membership_id,
      unique: true,
      where: "used_at IS NULL",
      name: "index_membership_invite_tokens_on_membership_id_unused"
    add_index :membership_invite_tokens, [:school_id, :expires_at]
  end
end
