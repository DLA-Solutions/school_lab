# frozen_string_literal: true

class AddIngressFieldsToWebhookEvents < ActiveRecord::Migration[8.1]
  def change
    add_reference :webhook_events, :school, foreign_key: true
    add_column :webhook_events, :provider_resource_id, :string
    add_column :webhook_events, :processing_error, :text
  end
end
