# frozen_string_literal: true

# What the school took in and what it paid out. Tuition already lives in `charges`, but a school
# also sells textbooks, receives a grant, and pays a payroll — none of which a boleto explains.
# Kept as its own ledger so the dashboard can answer "what came in this month" without pretending
# every movement was a charge.
class CreateSchoolTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :school_transactions do |t|
      t.references :school, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :category, null: false
      t.string :description
      t.integer :amount_cents, null: false
      t.date :occurred_on, null: false
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    # The dashboard reads this ledger a month at a time, split by direction.
    add_index :school_transactions, %i[school_id occurred_on]
    add_index :school_transactions, %i[school_id kind]

    add_check_constraint :school_transactions,
                         "kind IN ('income', 'expense')",
                         name: "school_transactions_kind_allowed"

    # Direction is carried by `kind`; the amount is always what changed hands.
    add_check_constraint :school_transactions,
                         "amount_cents >= 0",
                         name: "school_transactions_amount_cents_non_negative"
  end
end
