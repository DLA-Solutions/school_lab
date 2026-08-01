# frozen_string_literal: true

class AddObservedStatusToWebhookEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :webhook_events, :observed_status, :string
  end
end
