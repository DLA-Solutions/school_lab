# frozen_string_literal: true

class AddInterestRatePercentToSchoolBillingSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :school_billing_settings, :interest_rate_percent, :decimal, precision: 5, scale: 2

    add_check_constraint :school_billing_settings,
                         "interest_rate_percent IS NULL OR (interest_rate_percent > 0 AND interest_rate_percent <= 100)",
                         name: "school_billing_settings_interest_rate_percent_range"
  end
end
