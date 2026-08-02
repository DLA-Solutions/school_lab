# frozen_string_literal: true

class AddSettlementBreakdownToPayments < ActiveRecord::Migration[8.1]
  def change
    add_column :payments, :fine_amount_cents, :integer, null: false, default: 0
    add_column :payments, :interest_amount_cents, :integer, null: false, default: 0

    add_check_constraint :payments, "fine_amount_cents >= 0", name: "payments_fine_amount_cents_non_negative"
    add_check_constraint :payments, "interest_amount_cents >= 0", name: "payments_interest_amount_cents_non_negative"
  end
end
