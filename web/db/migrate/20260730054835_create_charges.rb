# frozen_string_literal: true

class CreateCharges < ActiveRecord::Migration[8.1]
  def change
    create_table :charges do |t|
      t.references :contract, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :guardian, null: false, foreign_key: true
      t.string :billing_period
      t.decimal :original_amount, precision: 12, scale: 2
      t.decimal :discount_amount, precision: 12, scale: 2, default: 0
      t.decimal :late_fee_amount, precision: 12, scale: 2, default: 0
      t.decimal :total_amount, precision: 12, scale: 2
      t.date :due_date
      t.string :status, null: false, default: "pending"
      t.string :psp_charge_id
      t.string :boleto_url
      t.text :pix_copy_paste
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :charges, %i[school_id status]
    add_index :charges, %i[school_id due_date]
    add_index :charges, :psp_charge_id, unique: true, where: "psp_charge_id IS NOT NULL"
  end
end
