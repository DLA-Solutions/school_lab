# frozen_string_literal: true

# A file uploaded before it is attached to a message or a daily routine. Bytes, content type,
# and size live on the Active Storage blob; this row only records the school, who uploaded it,
# and which owner it belongs to. Both owners may be null while the upload is still in flight,
# and they must not both be set.
class CreateCommunicationAttachments < ActiveRecord::Migration[8.1]
  def change
    create_table :communication_attachments do |t|
      t.references :school, null: false, foreign_key: true
      t.references :uploaded_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.references :message, foreign_key: true
      t.references :daily_routine, foreign_key: true

      t.timestamps
    end

    add_index :communication_attachments, %i[school_id uploaded_by_membership_id],
              name: "index_communication_attachments_on_school_and_uploader"

    add_check_constraint :communication_attachments,
                         "message_id IS NULL OR daily_routine_id IS NULL",
                         name: "communication_attachments_single_owner"
  end
end
