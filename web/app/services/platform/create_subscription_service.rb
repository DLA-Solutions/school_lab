# frozen_string_literal: true

module Platform
  class CreateSubscriptionService < ApplicationService
    def initialize(params:)
      @params = params.to_h.symbolize_keys
    end

    def call
      school = School.kept.find_by(id: params[:school_id])
      return ResponseService.failure(code: :not_found) unless school

      plan = PlatformPlan.kept.find_by(id: params[:platform_plan_id])
      return ResponseService.failure(code: :not_found) unless plan

      if PlatformSubscription.kept.exists?(school_id: school.id)
        return ResponseService.failure(code: :subscription_exists)
      end

      subscription = PlatformSubscription.create!(
        school: school,
        platform_plan: plan,
        status: params[:status].presence || "active",
        trial_ends_at: params[:trial_ends_at],
        current_period_end: params[:current_period_end]
      )

      ResponseService.success(data: subscription)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :params
  end
end
