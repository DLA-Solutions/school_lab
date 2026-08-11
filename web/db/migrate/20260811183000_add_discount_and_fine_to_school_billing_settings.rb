# frozen_string_literal: true

class AddDiscountAndFineToSchoolBillingSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :school_billing_settings, :early_payment_discount_percent, :decimal, precision: 5, scale: 2
    add_column :school_billing_settings, :fine_type, :string
    add_column :school_billing_settings, :fine_rate_percent, :decimal, precision: 5, scale: 2
    add_column :school_billing_settings, :fine_amount_cents, :integer

    add_check_constraint :school_billing_settings,
                         "early_payment_discount_percent IS NULL OR (early_payment_discount_percent > 0 AND early_payment_discount_percent <= 100)",
                         name: "school_billing_settings_early_payment_discount_percent_range"

    add_check_constraint :school_billing_settings,
                         "fine_type IS NULL OR fine_type IN ('percent', 'fixed')",
                         name: "school_billing_settings_fine_type_allowed"

    add_check_constraint :school_billing_settings,
                         "fine_type IS NOT NULL OR (fine_rate_percent IS NULL AND fine_amount_cents IS NULL)",
                         name: "school_billing_settings_fine_off_requires_null_values"

    add_check_constraint :school_billing_settings,
                         "fine_type IS NULL OR fine_type <> 'percent' OR (fine_rate_percent > 0 AND fine_rate_percent <= 100 AND fine_amount_cents IS NULL)",
                         name: "school_billing_settings_fine_percent_shape"

    add_check_constraint :school_billing_settings,
                         "fine_type IS NULL OR fine_type <> 'fixed' OR (fine_amount_cents > 0 AND fine_rate_percent IS NULL)",
                         name: "school_billing_settings_fine_fixed_shape"
  end
end
