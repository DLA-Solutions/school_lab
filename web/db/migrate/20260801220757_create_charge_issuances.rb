# frozen_string_literal: true

class CreateChargeIssuances < ActiveRecord::Migration[8.1]
  def change
    create_table :charge_issuances do |t|
      t.references :charge, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_invoice_id
      t.string :idempotency_key, null: false
      t.string :status, null: false, default: "pending"
      t.integer :amount_cents, null: false
      t.date :due_date, null: false
      t.string :boleto_url
      t.string :digitable_line
      t.string :barcode
      t.string :our_number
      t.text :pix_emv
      t.datetime :issued_at
      t.datetime :cancelled_at
      t.text :last_error

      t.timestamps
    end

    add_index :charge_issuances, :idempotency_key, unique: true
    add_index :charge_issuances, :provider_invoice_id, unique: true, where: "provider_invoice_id IS NOT NULL"
    add_index :charge_issuances, %i[charge_id status]

    add_check_constraint :charge_issuances, "amount_cents >= 0",
                         name: "charge_issuances_amount_cents_non_negative"
  end
end
