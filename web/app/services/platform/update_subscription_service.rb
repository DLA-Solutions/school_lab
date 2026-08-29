# frozen_string_literal: true

module Platform
  class UpdateSubscriptionService < ApplicationService
    GATEWAY_LOCKED_FIELDS = %i[platform_plan_id billing_interval].freeze

    def initialize(subscription:, params:)
      @subscription = subscription
      @params = params.to_h.symbolize_keys
    end

    def call
      if subscription.collected_by_gateway? && gateway_locked_change?
        return ResponseService.failure(code: :invalid_state_transition)
      end

      attributes = {}
      if params.key?(:status)
        status = params[:status].to_s
        attributes[:status] = status == "trial" ? "trialing" : status
      end
      attributes[:trial_ends_at] = params[:trial_ends_at] if params.key?(:trial_ends_at)
      attributes[:current_period_end] = params[:current_period_end] if params.key?(:current_period_end)
      attributes[:billing_interval] = params[:billing_interval] if params.key?(:billing_interval)

      if params[:platform_plan_id].present?
        plan = PlatformPlan.kept.find_by(id: params[:platform_plan_id])
        return ResponseService.failure(code: :not_found) unless plan

        attributes[:platform_plan] = plan
      end

      subscription.update!(attributes)
      ResponseService.success(data: subscription.reload)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :subscription, :params

    def gateway_locked_change?
      GATEWAY_LOCKED_FIELDS.any? { |field| params.key?(field) }
    end
  end
end
