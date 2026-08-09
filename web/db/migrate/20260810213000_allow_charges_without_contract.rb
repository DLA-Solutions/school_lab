# frozen_string_literal: true

# A one-off boleto is not always about schooling: a room rented for a weekend, a lost library
# book, a uniform bought by someone who is not enrolled. What the slip always needs is a payer —
# the CPF it is registered against — so `guardian_id` stays required and the contract becomes a
# reference the school may or may not have.
class AllowChargesWithoutContract < ActiveRecord::Migration[8.1]
  def change
    change_column_null :charges, :contract_id, true
  end
end
