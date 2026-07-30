# frozen_string_literal: true

class CreatePayments < ActiveRecord::Migration[8.1]
  def change
    create_table :payments do |t|
      t.references :charge, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.decimal :paid_amount, precision: 12, scale: 2
      t.string :payment_method
      t.string :psp_transaction_id
      t.datetime :paid_at
      t.string :status, null: false, default: "confirmed"

      t.timestamps
    end

    add_index :payments, :psp_transaction_id, unique: true, where: "psp_transaction_id IS NOT NULL"
  end
end
