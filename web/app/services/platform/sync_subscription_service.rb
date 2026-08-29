# frozen_string_literal: true

module Platform
  class SyncSubscriptionService < ApplicationService
    def initialize(subscription:, remote:, plan: nil, interval: nil)
      @subscription = subscription
      @remote = remote
      @plan = plan
      @interval = interval
    end

    def call
      attrs = {
        status: remote.status,
        external_subscription_id: remote.external_subscription_id,
        external_customer_id: remote.external_customer_id.presence || subscription.external_customer_id,
        current_period_start: remote.current_period_start,
        current_period_end: remote.current_period_end,
        trial_ends_at: remote.trial_ends_at,
        cancel_at_period_end: remote.cancel_at_period_end,
        canceled_at: remote.canceled_at
      }
      attrs[:platform_plan] = plan if plan
      attrs[:billing_interval] = interval if interval

      subscription.update!(attrs.compact)
      ResponseService.success(data: subscription.reload)
    end

    private

    attr_reader :subscription, :remote, :plan, :interval
  end
end
