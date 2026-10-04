# frozen_string_literal: true

# What was sent on a family thread. Sent content is not edited and not deleted, so there is no
# edited_at, no scheduled_for, and no discarded_at. A routine card is the same row with kind
# routine, which keeps the guardian timeline as one list.
class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.references :conversation, null: false, foreign_key: true
      # Copied from the conversation so tenant scope does not depend on joining through it.
      t.references :school, null: false, foreign_key: true
      t.references :sender_membership, null: false, foreign_key: { to_table: :memberships }
      # Empty when the message is only a file, or only a routine card.
      t.text :body
      t.string :kind, null: false, default: "text"
      # Set only for kind routine. Text rows leave this null, so the unique index is partial.
      t.references :daily_routine, foreign_key: true, index: false
      # A class notice copies one id onto each child thread. Repeating that send must not insert again.
      t.string :client_request_id
      t.datetime :sent_at, null: false

      t.timestamps
    end

    add_index :messages, %i[conversation_id sent_at]
    add_index :messages, :daily_routine_id,
              unique: true,
              where: "daily_routine_id IS NOT NULL",
              name: "index_messages_on_daily_routine_id_unique"
    add_index :messages, %i[conversation_id client_request_id],
              unique: true,
              where: "client_request_id IS NOT NULL",
              name: "index_messages_on_conversation_and_client_request_id"

    add_check_constraint :messages,
                         "kind IN ('text', 'routine')",
                         name: "messages_kind"
  end
end
