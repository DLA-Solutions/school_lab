# frozen_string_literal: true

# `environment` only ever selected which Cora hosts to talk to, which is a property of the
# deploy (see `config.x.billing.cora_environment`), not of the school. Keeping it here allowed
# two active configurations per school and instrument, and a sandbox row to be picked inside a
# production deploy. A school now has one configuration per instrument: provider, credentials
# and whether it is active.
class RemoveEnvironmentFromSchoolPaymentProviders < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :school_payment_providers,
                            name: "school_payment_providers_environment_allowed"

    remove_index :school_payment_providers, name: "index_school_payment_providers_active_triple"

    remove_column :school_payment_providers, :environment

    add_index :school_payment_providers, %i[school_id instrument],
              unique: true,
              where: "active = true",
              name: "index_school_payment_providers_active_pair"
  end

  def down
    remove_index :school_payment_providers, name: "index_school_payment_providers_active_pair"

    add_column :school_payment_providers, :environment, :string
    execute("UPDATE school_payment_providers SET environment = 'production'")
    change_column_null :school_payment_providers, :environment, false

    add_index :school_payment_providers, %i[school_id instrument environment],
              unique: true,
              where: "active = true",
              name: "index_school_payment_providers_active_triple"

    add_check_constraint :school_payment_providers,
                         "environment IN ('stage', 'production')",
                         name: "school_payment_providers_environment_allowed"
  end
end
