# frozen_string_literal: true

module Billing
  # Billing configuration of the deploy, read by name. The values are stored in
  # `config.x.billing` — Rails' convention for custom configuration — and set per environment
  # file; this is the only place that reaches for them.
  module Settings
    module_function


    # How long a processed webhook event is kept before Billing::PurgeWebhookEventsService
    # deletes it.
    def webhook_events_retention_days
      billing_config.webhook_events_retention_days
    end

    def billing_config
      Rails.application.config.x.billing
    end
    private_class_method :billing_config
  end
end
