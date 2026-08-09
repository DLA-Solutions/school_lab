# frozen_string_literal: true

# Per-school credentials for the e-signature provider, mirroring `school_payment_providers`:
# each school signs under its own Autentique account, and its token must never be readable from
# a dump.
class CreateSchoolSignatureProviders < ActiveRecord::Migration[8.1]
  def change
    create_table :school_signature_providers do |t|
      t.references :school, null: false, foreign_key: true
      t.string :provider, null: false
      t.boolean :active, default: true, null: false

      # Encrypted at the application layer (`encrypts` on the model).
      t.text :api_token
      t.text :webhook_secret

      t.string :webhook_endpoint_token, null: false
      t.jsonb :settings, default: {}, null: false
      t.datetime :uploaded_at
      t.references :uploaded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    # One active configuration per school, like the payment side.
    add_index :school_signature_providers,
              :school_id,
              unique: true,
              where: "active = true",
              name: "index_school_signature_providers_active_school"

    add_index :school_signature_providers,
              :webhook_endpoint_token,
              unique: true,
              name: "index_school_signature_providers_on_webhook_token"

    add_check_constraint :school_signature_providers,
                         "provider IN ('autentique', 'fake')",
                         name: "school_signature_providers_provider_allowed"

    # What the provider knows the contract as, so a webhook can find its way back to one row.
    add_column :contracts, :signature_provider, :string
    add_column :contracts, :provider_document_id, :string
    add_column :contracts, :signature_requested_at, :datetime

    add_index :contracts,
              %i[signature_provider provider_document_id],
              unique: true,
              where: "provider_document_id IS NOT NULL",
              name: "index_contracts_on_provider_document"
  end
end
