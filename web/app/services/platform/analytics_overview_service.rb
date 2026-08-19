# frozen_string_literal: true

module Platform
  class AnalyticsOverviewService < ApplicationService
    def initialize(date_from: nil, date_to: nil, as_of: Time.current)
      @date_from = date_from
      @date_to = date_to
      @as_of = as_of
    end

    def call
      date_from_result = parse_date(date_from, :date_from)
      return date_from_result if date_from_result.failure?

      date_to_result = parse_date(date_to, :date_to)
      return date_to_result if date_to_result.failure?

      @parsed_date_from = date_from_result.data
      @parsed_date_to = date_to_result.data

      if @parsed_date_from && @parsed_date_to && @parsed_date_from > @parsed_date_to
        return ResponseService.failure(
          code: :validation_error,
          details: { date_to: [ "must be on or after date_from" ] }
        )
      end

      ResponseService.success(
        data: {
          active_schools: active_schools_count,
          provisioning_count: provisioning_count,
          module_adoption: module_adoption,
          mrr_cents: mrr_cents,
          onboarding_funnel: onboarding_funnel
        }
      )
    end

    private

    attr_reader :date_from, :date_to, :as_of

    def active_schools_count
      School.kept.where(onboarding_status: "active").count
    end

    def provisioning_count
      School.kept.where(onboarding_status: "provisioning").count
    end

    def module_adoption
      active_school_ids = School.kept.where(onboarding_status: "active").select(:id)
      total = active_school_ids.count
      return SchoolLab::SchoolModuleKeys.keys.index_with { 0.0 } if total.zero?

      SchoolLab::SchoolModuleKeys.keys.index_with do |module_key|
        enabled_count = SchoolModule.where(school_id: active_school_ids, module_key: module_key, enabled: true).count
        (enabled_count.to_f / total).round(4)
      end
    end

    def mrr_cents
      rows = PlatformSubscription.kept.billable.joins(:platform_plan).includes(
        platform_plan: :platform_plan_provider_prices
      )
      rows.sum do |subscription|
        price = subscription.platform_plan.platform_plan_provider_prices.find do |row|
          row.active? &&
            row.provider == subscription.provider &&
            row.billing_interval == (subscription.billing_interval.presence || "month")
        end
        amount = price&.amount_cents || subscription.platform_plan.monthly_amount_cents
        subscription.billing_interval == "year" ? (amount / 12) : amount
      end
    end

    def onboarding_funnel
      scope = School.kept
      scope = scope.where(created_at: @parsed_date_from.beginning_of_day..) if @parsed_date_from
      scope = scope.where(created_at: ..@parsed_date_to.end_of_day) if @parsed_date_to

      School::ONBOARDING_STATUSES.index_with do |status|
        scope.where(onboarding_status: status).count
      end
    end

    def parse_date(value, param_name)
      return ResponseService.success(data: nil) if value.blank?

      ResponseService.success(data: Date.iso8601(value.to_s))
    rescue Date::Error
      ResponseService.failure(
        code: :validation_error,
        details: { param_name => [ "must be a valid ISO date (YYYY-MM-DD)" ] }
      )
    end
  end
end
