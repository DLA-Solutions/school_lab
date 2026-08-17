# frozen_string_literal: true

class CreateTaxDeclarationVersions < ActiveRecord::Migration[8.1]
  def change
    create_table :tax_declaration_versions do |t|
      t.references :school, null: false, foreign_key: true
      t.references :tax_declaration, null: false, foreign_key: true
      t.integer :version, null: false
      t.bigint :supersedes_id
      t.string :calculation_digest, null: false
      t.integer :total_declared_principal_amount_cents, null: false
      t.integer :settings_version, null: false
      t.jsonb :school_identity_snapshot, null: false, default: {}
      t.jsonb :payer_identity_snapshot, null: false, default: {}
      t.text :legal_text_snapshot, null: false
      t.string :legal_text_version_snapshot, null: false
      t.jsonb :document_signatory_snapshot, null: false, default: {}
      t.jsonb :purpose_configuration_snapshot, null: false, default: {}
      t.jsonb :approval_snapshot, null: false, default: {}
      t.jsonb :calculation_snapshot, null: false, default: {}
      t.string :verification_code, null: false
      t.string :pdf_storage_key, null: false
      t.datetime :issued_at, null: false

      t.timestamps
    end

    add_index :tax_declaration_versions,
              %i[tax_declaration_id version],
              unique: true,
              name: "index_tax_declaration_versions_on_declaration_version"
    add_index :tax_declaration_versions,
              %i[tax_declaration_id calculation_digest],
              unique: true,
              name: "index_tax_declaration_versions_on_declaration_digest"
    add_index :tax_declaration_versions, :verification_code, unique: true

    add_foreign_key :tax_declaration_versions, :tax_declaration_versions, column: :supersedes_id
    add_foreign_key :tax_declarations, :tax_declaration_versions, column: :active_version_id
  end
end
