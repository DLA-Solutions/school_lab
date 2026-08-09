# frozen_string_literal: true

# A school also bills things outside the monthly schedule — a trip, a second uniform, a late fee
# agreed by hand. Those are charges too, but they must not collide with the tuition of the month.
class AddKindToCharges < ActiveRecord::Migration[8.1]
  OLD_INDEX = "index_charges_on_contract_id_and_billing_period_kept"
  NEW_INDEX = "index_charges_on_contract_period_tuition_kept"

  def up
    add_column :charges, :kind, :string, null: false, default: "tuition"
    add_column :charges, :description, :string

    add_check_constraint :charges, "kind IN ('tuition', 'one_off')", name: "charges_kind_allowed"

    # The old index allowed one charge per contract per period, which is what stops the monthly
    # generation running twice. That protection has to survive, but it cannot apply to one-off
    # charges: a school may raise several in the same month.
    remove_index :charges, name: OLD_INDEX
    add_index :charges,
              %i[contract_id billing_period],
              unique: true,
              where: "discarded_at IS NULL AND kind = 'tuition'",
              name: NEW_INDEX
  end

  def down
    remove_index :charges, name: NEW_INDEX
    add_index :charges,
              %i[contract_id billing_period],
              unique: true,
              where: "discarded_at IS NULL",
              name: OLD_INDEX

    remove_check_constraint :charges, name: "charges_kind_allowed"
    remove_column :charges, :kind
    remove_column :charges, :description
  end
end
