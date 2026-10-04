# frozen_string_literal: true

# The family thread is about a child, not a pair of people. Guardians of that child and the
# teachers of their class are derived elsewhere; the row only records which child, in which
# school. One kept thread per pair, so two families never share a room and a discarded thread
# can be opened again.
class CreateConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      # Inbox sort key. Stays null until something is actually said, so an empty thread does
      # not float to the top as if it had just happened.
      t.datetime :last_message_at
      # No delete API in this cut. Discard retires a thread without dropping its history, and
      # uniqueness applies only to kept rows.
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :conversations, %i[school_id student_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_conversations_on_school_id_and_student_id_kept"
    add_index :conversations, %i[school_id last_message_at]
  end
end
