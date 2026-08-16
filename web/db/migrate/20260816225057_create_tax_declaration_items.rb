# frozen_string_literal: true

class CreateTaxDeclarationItems < ActiveRecord::Migration[8.1]
  def change
    create_table :tax_declaration_items do |t|
      t.references :school, null: false, foreign_key: true
      t.references :tax_declaration_version, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.references :payment, null: false, foreign_key: true
      t.references :charge, null: false, foreign_key: true
      t.string :billing_purpose_code, null: false
      t.datetime :paid_at, null: false
      t.integer :source_paid_amount_cents, null: false
      t.integer :source_fine_amount_cents, null: false, default: 0
      t.integer :source_interest_amount_cents, null: false, default: 0
      t.integer :declared_principal_amount_cents, null: false

      t.timestamps
    end

    add_index :tax_declaration_items,
              %i[tax_declaration_version_id payment_id],
              unique: true,
              name: "index_tax_declaration_items_on_version_payment"
    add_index :tax_declaration_items,
              %i[tax_declaration_version_id student_id],
              name: "index_tax_declaration_items_on_version_student"

    add_check_constraint :tax_declaration_items,
                         "source_fine_amount_cents >= 0",
                         name: "tax_declaration_items_fine_non_negative"
    add_check_constraint :tax_declaration_items,
                         "source_interest_amount_cents >= 0",
                         name: "tax_declaration_items_interest_non_negative"
    add_check_constraint :tax_declaration_items,
                         "declared_principal_amount_cents >= 0",
                         name: "tax_declaration_items_declared_principal_non_negative"
  end
end
