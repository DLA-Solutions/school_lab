# frozen_string_literal: true

module Platform
  class UpdateSubscriptionService < ApplicationService
    def initialize(subscription:, params:)
      @subscription = subscription
      @params = params.to_h.symbolize_keys
    end

    def call
      attributes = {}
      attributes[:status] = params[:status] if params.key?(:status)
      attributes[:trial_ends_at] = params[:trial_ends_at] if params.key?(:trial_ends_at)
      attributes[:current_period_end] = params[:current_period_end] if params.key?(:current_period_end)

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
  end
end
