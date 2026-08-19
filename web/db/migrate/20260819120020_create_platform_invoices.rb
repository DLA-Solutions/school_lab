# frozen_string_literal: true

class CreatePlatformInvoices < ActiveRecord::Migration[8.1]
  def change
    create_table :platform_invoices do |t|
      t.references :school, null: false, foreign_key: true
      t.references :platform_subscription, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :external_invoice_id
      t.string :status, null: false, default: "open"
      t.integer :amount_cents, null: false
      t.datetime :due_at
      t.datetime :paid_at
      t.string :hosted_invoice_url
      t.string :payment_method

      t.timestamps
    end

    add_index :platform_invoices, %i[school_id status]
    add_index :platform_invoices, %i[provider external_invoice_id],
              unique: true,
              where: "external_invoice_id IS NOT NULL",
              name: "index_platform_invoices_on_provider_and_external_id"
  end
end
