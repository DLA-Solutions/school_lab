# frozen_string_literal: true

class CreatePlatformImpersonationSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :platform_impersonation_sessions do |t|
      t.references :operator_user, null: false, foreign_key: { to_table: :users }
      t.references :target_user, null: false, foreign_key: { to_table: :users }
      t.references :school, null: false, foreign_key: true
      t.references :target_membership, null: false, foreign_key: { to_table: :memberships }
      t.datetime :expires_at, null: false
      t.datetime :ended_at

      t.timestamps
    end

    add_index :platform_impersonation_sessions, :expires_at
    add_index :platform_impersonation_sessions, :ended_at
  end
end
