# frozen_string_literal: true

module Billing
  class PurgeWebhookEventsJob < ApplicationJob
    queue_as :billing

    def perform
      result = PurgeWebhookEventsService.call
      return unless result.success? && result.data[:deleted_count].positive?

      Rails.logger.info(
        {
          event: "billing.webhook_events.purged",
          deleted_count: result.data[:deleted_count],
          cutoff: result.data[:cutoff].iso8601
        }.to_json
      )
    end
  end
end
