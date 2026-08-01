# frozen_string_literal: true

class CreatePayments < ActiveRecord::Migration[8.1]
  def change
    create_table :payments do |t|
      t.references :charge, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.integer :paid_amount_cents, null: false
      t.string :payment_method
      t.string :provider_payment_id
      t.datetime :paid_at
      t.string :status, null: false, default: "confirmed"

      t.timestamps
    end

    add_index :payments, :provider_payment_id, unique: true, where: "provider_payment_id IS NOT NULL"

    add_check_constraint :payments, "paid_amount_cents >= 0",
                         name: "payments_paid_amount_cents_non_negative"
  end
end
