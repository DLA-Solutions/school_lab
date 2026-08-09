# frozen_string_literal: true

class AddAddressToGuardians < ActiveRecord::Migration[8.1]
  def change
    add_column :guardians, :zip_code, :string, limit: 8
    add_column :guardians, :street, :string
    add_column :guardians, :number, :string
    add_column :guardians, :complement, :string
    add_column :guardians, :neighborhood, :string
    add_column :guardians, :city, :string
    add_column :guardians, :state, :string, limit: 2

    # The address is optional, but a stored UF must be a real one — the UI offers a fixed list and
    # anything else can only arrive from a direct API call.
    add_check_constraint :guardians,
                         "state IS NULL OR state ~ '^[A-Z]{2}$'",
                         name: "guardians_state_format"

    # CEP is stored as the 8 digits alone; formatting is a presentation concern.
    add_check_constraint :guardians,
                         "zip_code IS NULL OR zip_code ~ '^[0-9]{8}$'",
                         name: "guardians_zip_code_format"
  end
end
