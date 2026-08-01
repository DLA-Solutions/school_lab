# frozen_string_literal: true

class CreateSchoolPaymentProviders < ActiveRecord::Migration[8.1]
  def change
    create_table :school_payment_providers do |t|
      t.references :school, null: false, foreign_key: true
      t.string :instrument, null: false
      t.string :provider, null: false
      t.string :environment, null: false
      t.boolean :active, null: false, default: true
      t.jsonb :settings, null: false, default: {}
      t.string :client_id
      t.text :certificate_pem
      t.text :private_key_pem
      t.string :certificate_fingerprint
      t.datetime :certificate_expires_at
      t.datetime :uploaded_at
      t.references :uploaded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :school_payment_providers, %i[school_id instrument environment],
              unique: true,
              where: "active = true",
              name: "index_school_payment_providers_active_triple"

    add_check_constraint :school_payment_providers,
                         "instrument IN ('bank_slip')",
                         name: "school_payment_providers_instrument_allowed"
    add_check_constraint :school_payment_providers,
                         "environment IN ('stage', 'production')",
                         name: "school_payment_providers_environment_allowed"
  end
end
