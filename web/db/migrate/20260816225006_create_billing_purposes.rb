# frozen_string_literal: true

class CreateBillingPurposes < ActiveRecord::Migration[8.1]
  def change
    create_table :billing_purposes do |t|
      t.references :school, null: false, foreign_key: true
      t.string :code, null: false
      t.string :name, null: false
      t.boolean :tax_declaration_eligible, null: false, default: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :billing_purposes, %i[school_id code],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_billing_purposes_on_school_id_and_code_kept"
  end
end
