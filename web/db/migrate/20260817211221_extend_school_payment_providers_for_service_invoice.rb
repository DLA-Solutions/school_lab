# frozen_string_literal: true

class ExtendSchoolPaymentProvidersForServiceInvoice < ActiveRecord::Migration[8.1]
  def up
    add_column :school_payment_providers, :api_key, :text

    remove_check_constraint :school_payment_providers, name: "school_payment_providers_instrument_allowed"
    add_check_constraint :school_payment_providers,
                         "instrument::text = ANY (ARRAY['bank_slip'::text, 'service_invoice'::text])",
                         name: "school_payment_providers_instrument_allowed"
  end

  def down
    remove_check_constraint :school_payment_providers, name: "school_payment_providers_instrument_allowed"
    add_check_constraint :school_payment_providers,
                         "instrument::text = 'bank_slip'::text",
                         name: "school_payment_providers_instrument_allowed"

    remove_column :school_payment_providers, :api_key
  end
end
