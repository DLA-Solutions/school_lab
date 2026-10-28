# frozen_string_literal: true

# Distinguishes charges issued by this platform from boletos the school created directly at the
# bank and later imported (Billing::ImportExternalBoletosService). external_reference is the
# bank-side invoice id (e.g. Inter codigoSolicitacao) — the dedup key for migrated charges, and
# populated where available for platform charges too.
class AddSourceAndExternalReferenceToCharges < ActiveRecord::Migration[8.1]
  def change
    add_column :charges, :source, :string, null: false, default: "platform"
    add_column :charges, :external_reference, :string

    add_index :charges, %i[school_id external_reference],
              unique: true,
              where: "external_reference IS NOT NULL",
              name: "index_charges_on_school_id_and_external_reference"

    add_check_constraint :charges, "source IN ('platform', 'migrated')", name: "charges_source_allowed"
  end
end
