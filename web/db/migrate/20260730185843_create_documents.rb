# frozen_string_literal: true

class CreateDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :documents do |t|
      t.references :school, null: false, foreign_key: true
      t.references :documentable, polymorphic: true, null: false
      t.string :document_type
      t.string :status, null: false, default: "pending"
      t.string :rejection_reason
      t.references :uploaded_by, foreign_key: { to_table: :users }
      t.datetime :reviewed_at
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :documents, %i[school_id status]
    add_index :documents, %i[documentable_type documentable_id]
  end
end
