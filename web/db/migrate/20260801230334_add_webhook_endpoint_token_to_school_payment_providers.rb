# frozen_string_literal: true

class AddWebhookEndpointTokenToSchoolPaymentProviders < ActiveRecord::Migration[8.1]
  def up
    add_column :school_payment_providers, :webhook_endpoint_token, :string

    say_with_time "Backfilling webhook endpoint tokens" do
      SchoolPaymentProvider.reset_column_information
      SchoolPaymentProvider.find_each do |config|
        config.update_column(:webhook_endpoint_token, SecureRandom.urlsafe_base64(32))
      end
    end

    change_column_null :school_payment_providers, :webhook_endpoint_token, false

    add_index :school_payment_providers, :webhook_endpoint_token, unique: true
  end

  def down
    remove_index :school_payment_providers, :webhook_endpoint_token
    remove_column :school_payment_providers, :webhook_endpoint_token
  end
end
