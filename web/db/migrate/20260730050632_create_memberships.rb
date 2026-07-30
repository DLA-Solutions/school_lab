# frozen_string_literal: true

class CreateMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :memberships do |t|
      t.references :user, null: false, foreign_key: true
      t.references :school, foreign_key: true
      t.string :role, null: false
      t.string :status, null: false, default: "active"
      t.datetime :suspended_at
      t.references :suspended_by, foreign_key: { to_table: :users }
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :memberships, %i[user_id school_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_memberships_on_user_id_and_school_id_kept"
  end
end
