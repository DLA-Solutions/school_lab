# frozen_string_literal: true

class CreateServiceInvoiceAttempts < ActiveRecord::Migration[8.1]
  def change
    create_table :service_invoice_attempts do |t|
      t.references :service_invoice, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :idempotency_key, null: false
      t.string :status, null: false, default: "pending"
      t.jsonb :provider_response
      t.text :last_error
      t.datetime :enqueued_at
      t.datetime :failed_at

      t.timestamps
    end

    add_index :service_invoice_attempts, :idempotency_key, unique: true
  end
end
