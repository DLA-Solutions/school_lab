# frozen_string_literal: true

module Billing
  class PurgeWebhookEventsService < ApplicationService
    def initialize(retention_days: nil, as_of: Time.current)
      @retention_days = retention_days || default_retention_days
      @as_of = as_of
    end

    def call
      cutoff = as_of - retention_days.days
      deleted_count = WebhookEvent.processed_before(cutoff).delete_all

      ResponseService.success(data: { deleted_count: deleted_count, cutoff: cutoff })
    end

    private

    attr_reader :retention_days, :as_of

    def default_retention_days
      Billing::Settings.webhook_events_retention_days
    end
  end
end
