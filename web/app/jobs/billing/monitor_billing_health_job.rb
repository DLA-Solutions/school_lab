# frozen_string_literal: true

module Billing
  class MonitorBillingHealthJob < ApplicationJob
    queue_as :billing

    def perform
      MonitorBillingHealthService.call
    end
  end
end
