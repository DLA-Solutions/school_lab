# frozen_string_literal: true

# Bank-created boletos found by Billing::ImportExternalBoletosService that could not be matched
# to an existing guardian — staff review queue. Resolving one creates a retroactive charge
# (source: migrated) and links it back here; dismissing one just closes the row.
class CreateUnmatchedBoletos < ActiveRecord::Migration[8.1]
  def change
    create_table :unmatched_boletos do |t|
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
    end

    add_index :unmatched_boletos, %i[school_id provider_invoice_id],
              unique: true,
              name: "index_unmatched_boletos_on_school_id_and_provider_invoice_id"
    add_index :unmatched_boletos, %i[school_id status]

    add_check_constraint :unmatched_boletos, "amount_cents >= 0", name: "unmatched_boletos_amount_cents_non_negative"
    add_check_constraint :unmatched_boletos, "status IN ('pending', 'resolved', 'dismissed')",
                          name: "unmatched_boletos_status_allowed"
    add_check_constraint :unmatched_boletos, "provider_status IN ('draft', 'open', 'paid', 'late', 'cancelled')",
                          name: "unmatched_boletos_provider_status_allowed"
  end
end
