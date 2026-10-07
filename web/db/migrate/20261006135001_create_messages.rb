# frozen_string_literal: true

# Immutable chat line. A sent message is not edited or discarded.
class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :sender_membership, null: false, foreign_key: { to_table: :memberships }
      t.text :body, null: false
      t.datetime :sent_at, null: false

      t.timestamps
    end

    add_index :messages, %i[conversation_id sent_at]
  end
end
