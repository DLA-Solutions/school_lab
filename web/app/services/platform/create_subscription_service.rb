# frozen_string_literal: true

module Platform
  class CreateSubscriptionService < ApplicationService
    DEFAULT_INTERVAL = "month"

    def initialize(params:)
      @params = params.to_h.symbolize_keys
    end

    def call
      school = School.kept.find_by(id: params[:school_id])
      return ResponseService.failure(code: :not_found) unless school

      plan = resolve_plan
      return ResponseService.failure(code: :not_found) unless plan

      if PlatformSubscription.kept.exists?(school_id: school.id)
        return ResponseService.failure(code: :subscription_exists)
      end

      interval = params[:billing_interval].presence || DEFAULT_INTERVAL
      unless PlatformSubscription::INTERVALS.include?(interval)
        return ResponseService.failure(
          code: :validation_error,
          details: { billing_interval: [ "must be month or year" ] }
        )
      end

      provider = (params[:provider].presence || "manual").to_s
      unless PlatformSubscription::PROVIDERS.include?(provider)
        return ResponseService.failure(
          code: :validation_error,
          details: { provider: [ "must be iugu, manual, or fake" ] }
        )
      end

      trial = ActiveModel::Type::Boolean.new.cast(params[:trial])
      status = params[:status].presence || (trial ? "trialing" : "active")
      trial_ends_at = params[:trial_ends_at].presence || (trial ? 14.days.from_now : nil)
      collection_method = provider == "manual" ? "manual" : "send_invoice"

      subscription = PlatformSubscription.create!(
        school: school,
        platform_plan: plan,
        status: status,
        provider: provider,
        billing_interval: interval,
        collection_method: collection_method,
        trial_ends_at: trial_ends_at,
        current_period_start: Time.current,
        current_period_end: params[:current_period_end].presence || period_end_for(interval)
      )

      ResponseService.success(data: subscription)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :params

    def resolve_plan
      return PlatformPlan.kept.find_by(id: params[:platform_plan_id]) if params[:platform_plan_id].present?

      PlatformPlan.kept.find_by(key: params[:plan_key]) if params[:plan_key].present?
    end

    def period_end_for(interval)
      interval == "year" ? 1.year.from_now : 1.month.from_now
    end
  end
end
