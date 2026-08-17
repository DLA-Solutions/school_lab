# frozen_string_literal: true

class CreateTaxDeclarationSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :tax_declaration_settings do |t|
      t.references :school, null: false, foreign_key: true, index: { unique: true }
      t.references :document_signatory, foreign_key: true
      t.text :legal_text
      t.string :legal_text_version
      t.integer :configuration_version, null: false, default: 1
      t.string :approved_purpose_configuration_digest
      t.datetime :legal_accounting_approved_at
      t.references :approved_by, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
