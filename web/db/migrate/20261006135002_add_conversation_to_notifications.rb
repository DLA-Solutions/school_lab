# frozen_string_literal: true

# Message bells open the chat. Billing and other kinds leave conversation_id null.
class AddConversationToNotifications < ActiveRecord::Migration[8.1]
  def change
    add_reference :notifications, :conversation, null: true, foreign_key: true
  end
end
