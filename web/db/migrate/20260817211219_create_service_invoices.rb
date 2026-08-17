# frozen_string_literal: true

class CreateServiceInvoices < ActiveRecord::Migration[8.1]
  def change
    create_table :service_invoices do |t|
      t.references :school, null: false, foreign_key: true
      t.references :payment, null: false, foreign_key: true, index: { unique: true }
      t.references :charge, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_document_id
      t.string :integration_id, null: false
      t.string :status, null: false, default: "pending"
      t.string :invoice_number
      t.string :verification_code
      t.string :access_key
      t.string :pdf_blob_key
      t.string :xml_blob_key
      t.datetime :enqueued_at
      t.datetime :authorized_at
      t.datetime :rejected_at
      t.datetime :failed_at
      t.datetime :canceled_at
      t.text :last_error

      t.timestamps
    end

    add_index :service_invoices, :integration_id, unique: true
    add_index :service_invoices, :provider_document_id, unique: true,
              where: "provider_document_id IS NOT NULL"
    add_index :service_invoices, %i[school_id status]
  end
end
