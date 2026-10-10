class AddClientSecretToSchoolPaymentProviders < ActiveRecord::Migration[8.1]
  def change
    add_column :school_payment_providers, :client_secret, :text
  end
end
