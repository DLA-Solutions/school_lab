# frozen_string_literal: true

# Where a collaborator lives. The register already holds it for guardians, and it is asked for in
# the same places for staff: a work contract, a payroll registration, anything mailed to them.
#
# Every field is optional, unlike the guardian's. A school registering its existing staff has a
# name, a CPF and a post for everybody and an address for some of them, and a register that
# refused the incomplete ones would simply not be filled in.
class AddAddressToTeachers < ActiveRecord::Migration[8.1]
  def change
    change_table :teachers, bulk: true do |t|
      t.string :zip_code, limit: 8
      t.string :street
      t.string :number
      t.string :complement
      t.string :neighborhood
      t.string :city
      t.string :state, limit: 2
    end

    add_check_constraint :teachers, "state IS NULL OR state ~ '^[A-Z]{2}$'",
                         name: "teachers_state_format"
    add_check_constraint :teachers, "zip_code IS NULL OR zip_code ~ '^[0-9]{8}$'",
                         name: "teachers_zip_code_format"
  end
end
