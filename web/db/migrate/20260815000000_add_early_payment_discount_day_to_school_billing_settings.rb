# frozen_string_literal: true

# The punctuality discount already had a percentage but no deadline, so nothing could say by when
# a family has to pay to earn it. The deadline is not the due date: a contract can fall due on the
# 10th and still reward payment made by the 5th.
class AddEarlyPaymentDiscountDayToSchoolBillingSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :school_billing_settings, :early_payment_discount_day, :integer

    add_check_constraint :school_billing_settings,
                         "early_payment_discount_day IS NULL OR " \
                         "(early_payment_discount_day >= 1 AND early_payment_discount_day <= 28)",
                         name: "school_billing_settings_early_payment_discount_day_range"

    # A deadline with no percentage behind it rewards nothing, and a percentage with no deadline
    # cannot be earned. Either both are set or neither is.
    add_check_constraint :school_billing_settings,
                         "(early_payment_discount_percent IS NULL) = " \
                         "(early_payment_discount_day IS NULL)",
                         name: "school_billing_settings_early_payment_discount_pair"
  end
end
