# frozen_string_literal: true

module Platform
  class ListAuditsService < ApplicationService
    def initialize(filters:)
      @filters = filters
    end

    def call
      date_from_result = parse_date(filters[:date_from], :date_from)
      return date_from_result if date_from_result.failure?

      date_to_result = parse_date(filters[:date_to], :date_to)
      return date_to_result if date_to_result.failure?

      @date_from = date_from_result.data
      @date_to = date_to_result.data

      if @date_from && @date_to && @date_from > @date_to
        return ResponseService.failure(
          code: :validation_error,
          details: { date_to: [ "must be on or after date_from" ] }
        )
      end

      ResponseService.success(data: apply_filters(Audited::Audit.order(created_at: :desc)))
    end

    private

    attr_reader :filters

    def apply_filters(scope)
      scope = scope.where(action: filters[:action]) if filters[:action].present?

      if filters[:school_id].present?
        school_id = filters[:school_id].to_i
        scope = scope.where(
          "(associated_type = 'School' AND associated_id = :school_id) OR " \
          "(auditable_type = 'School' AND auditable_id = :school_id)",
          school_id: school_id
        )
      end

      scope = scope.where(created_at: @date_from.beginning_of_day..) if @date_from
      scope = scope.where(created_at: ..@date_to.end_of_day) if @date_to

      scope
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
