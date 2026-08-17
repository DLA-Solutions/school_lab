# frozen_string_literal: true

class CreateDocumentSignatories < ActiveRecord::Migration[8.1]
  def change
    create_table :document_signatories do |t|
      t.references :school, null: false, foreign_key: true
      t.string :role_label, null: false
      t.string :name, null: false
      t.string :title
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :document_signatories, %i[school_id discarded_at]
  end
end
