# frozen_string_literal: true

# Typed minutes (ata) written in the product, rendered to PDF and signed through the e-signature
# provider (BR-LA02..BR-LA06). Signature columns mirror the contract ones.
class CreateMinutesEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :minutes_entries do |t|
      t.references :school, null: false, foreign_key: true
      t.references :minutes_book, null: false, foreign_key: true
      t.references :school_class, foreign_key: true
      t.string :kind, null: false
      t.string :title, null: false
      t.date :held_on, null: false
      t.text :body
      t.string :status, null: false, default: "draft"
      t.string :signature_provider
      t.string :provider_document_id
      t.datetime :signature_requested_at
      t.datetime :signed_at
      t.datetime :cancelled_at
      t.string :signed_document_url
      t.references :created_by_membership, foreign_key: { to_table: :memberships }
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :minutes_entries, %i[school_id minutes_book_id]
    add_index :minutes_entries, %i[school_id status]
    add_index :minutes_entries, :provider_document_id
  end
end
