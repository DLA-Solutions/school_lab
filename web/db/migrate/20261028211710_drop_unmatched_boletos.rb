# frozen_string_literal: true

# Retires the unmatched-boletos staff review queue: the import now just skips a bank-created
# boleto whose payer CPF matches no guardian (counted and logged, never persisted). Any rows
# still sitting in the table are discarded with it. Fully reversible — the block below is the
# original table definition from CreateUnmatchedBoletos.
class DropUnmatchedBoletos < ActiveRecord::Migration[8.1]
  def change
    drop_table :unmatched_boletos do |t|
      t.references :school, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_invoice_id, null: false
      t.string :payer_cpf, null: false
      t.string :payer_name
      t.integer :amount_cents, null: false
      t.date :due_date
      t.string :provider_status, null: false
      t.integer :paid_amount_cents
      t.datetime :paid_at
      t.string :payment_method
      t.string :status, null: false, default: "pending"
      t.datetime :resolved_at
      t.references :resolved_by, foreign_key: { to_table: :users }
      t.references :resolved_guardian, foreign_key: { to_table: :guardians }
      t.references :charge, foreign_key: true

      t.timestamps

      t.index %i[school_id provider_invoice_id],
              unique: true,
              name: "index_unmatched_boletos_on_school_id_and_provider_invoice_id"
      t.index %i[school_id status]

      t.check_constraint "amount_cents >= 0", name: "unmatched_boletos_amount_cents_non_negative"
      t.check_constraint "status IN ('pending', 'resolved', 'dismissed')", name: "unmatched_boletos_status_allowed"
      t.check_constraint "provider_status IN ('draft', 'open', 'paid', 'late', 'cancelled')",
                         name: "unmatched_boletos_provider_status_allowed"
    end
  end
end
