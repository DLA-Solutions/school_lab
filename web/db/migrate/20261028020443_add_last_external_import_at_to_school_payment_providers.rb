# frozen_string_literal: true

# Watermark for Billing::ImportExternalBoletosService (bank_slip/inter only) — incremental sync
# resumes from here minus a lookback overlap. NULL means the one-time historical backfill has not
# run yet.
class AddLastExternalImportAtToSchoolPaymentProviders < ActiveRecord::Migration[8.1]
  def change
    add_column :school_payment_providers, :last_external_import_at, :datetime
  end
end
