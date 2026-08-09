# frozen_string_literal: true

# A school charges one full tuition and grants it at a discount — a sibling rate, a scholarship.
# Kept as records so the school edits its own bands instead of typing a different amount into
# every contract and hoping they match.
class CreatePlanDiscounts < ActiveRecord::Migration[8.1]
  def change
    create_table :plan_discounts do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.decimal :percent, precision: 5, scale: 2, null: false
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :plan_discounts,
              %i[school_id name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_plan_discounts_on_school_id_and_name_kept"

    # 100% is a full scholarship; anything outside the range is a typo, not a policy.
    add_check_constraint :plan_discounts,
                         "percent >= 0 AND percent <= 100",
                         name: "plan_discounts_percent_range"

    # Which band a contract was granted, so the amount can be explained later rather than being
    # an unexplained number.
    add_reference :contracts, :plan_discount, foreign_key: true
  end
end
