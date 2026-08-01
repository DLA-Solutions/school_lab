# frozen_string_literal: true

class CreateCharges < ActiveRecord::Migration[8.1]
  def change
    create_table :charges do |t|
      t.references :contract, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :guardian, null: false, foreign_key: true
      t.string :billing_period
      t.integer :original_amount_cents, null: false
      t.integer :discount_amount_cents, null: false, default: 0
      t.integer :late_fee_amount_cents, null: false, default: 0
      t.integer :total_amount_cents, null: false
      t.date :due_date
      t.string :status, null: false, default: "pending"
      t.string :provider_invoice_id
      t.string :boleto_url
      t.text :pix_copy_paste
      t.datetime :paid_at
      t.datetime :overdue_at
      t.datetime :cancelled_at
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :charges, %i[school_id status]
    add_index :charges, %i[school_id due_date]
    add_index :charges, :provider_invoice_id, unique: true, where: "provider_invoice_id IS NOT NULL"

    add_check_constraint :charges, "original_amount_cents >= 0",
                         name: "charges_original_amount_cents_non_negative"
    add_check_constraint :charges, "discount_amount_cents >= 0",
                         name: "charges_discount_amount_cents_non_negative"
    add_check_constraint :charges, "late_fee_amount_cents >= 0",
                         name: "charges_late_fee_amount_cents_non_negative"
    add_check_constraint :charges, "total_amount_cents >= 0",
                         name: "charges_total_amount_cents_non_negative"
  end
end
