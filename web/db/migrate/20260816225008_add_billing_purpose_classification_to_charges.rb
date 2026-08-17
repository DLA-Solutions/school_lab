# frozen_string_literal: true

class AddBillingPurposeClassificationToCharges < ActiveRecord::Migration[8.1]
  def change
    add_reference :charges, :billing_purpose, foreign_key: true
    add_column :charges, :billing_purpose_code, :string
    add_column :charges, :tax_declaration_eligible, :boolean, null: false, default: false
  end
end
