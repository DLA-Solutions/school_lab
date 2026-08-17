# frozen_string_literal: true

class CreateSchoolFiscalSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :school_fiscal_settings do |t|
      t.references :school, null: false, foreign_key: true, index: { unique: true }
      t.boolean :enabled, null: false, default: false
      t.string :issuance_city_name, null: false
      t.string :issuance_state, null: false, limit: 2
      t.integer :spedy_city_code, null: false
      t.jsonb :provider_options_snapshot, null: false, default: {}
      t.string :federal_service_code
      t.string :cnae_code
      t.string :city_service_code
      t.string :nbs_code
      t.string :national_taxation_code
      t.decimal :iss_rate_percent, precision: 5, scale: 2
      t.string :service_description, limit: 100
      t.string :taxation_type, null: false, default: "taxationInMunicipality"
      t.string :tax_location, null: false, default: "companyMunicipality"
      t.string :issue_type
      t.boolean :reform_tributaria_enabled, null: false, default: false
      t.jsonb :ibs_cbs_config, null: false, default: {}

      t.timestamps
    end
  end
end
