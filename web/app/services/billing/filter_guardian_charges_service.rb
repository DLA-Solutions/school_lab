# frozen_string_literal: true

module Billing
  # Narrows a guardian's already-authorized charge scope by the list filters of
  # `GET /me/charges`: status, calendar period (month/year) or a due-date range, and order.
  #
  # Validation lives here so the controller stays thin; every problem is reported at once, keyed by
  # the offending query param, as a `validation_error` (422).
  #
  # Without `status` the list is the legacy "open boletos" view (pending + overdue, oldest due
  # date first) that deployed mobile builds rely on. Any `status` opts into the unified list.
  class FilterGuardianChargesService < ApplicationService
    STATUSES = %w[pending overdue paid].freeze
    OPEN_STATUSES = %w[pending overdue].freeze
    ALL_KEYWORD = "all"
    ORDERS = %w[asc desc].freeze
    ISO_DATE = /\A\d{4}-\d{2}-\d{2}\z/
    YEAR = /\A\d{4}\z/
    MONTH = /\A\d{1,2}\z/

    def initialize(scope:, params:)
      @scope = scope
      @params = params.to_h.with_indifferent_access
      @errors = {}
    end

    def call
      statuses = parse_statuses
      period = parse_period
      direction = parse_order

      return ResponseService.failure(code: :validation_error, details: errors) if errors.any?

      relation = scope.with_status(statuses).due_between(period&.begin, period&.end)
      ResponseService.success(data: relation.by_due_date(direction))
    end

    private

    attr_reader :scope, :params, :errors

    def unified?
      params[:status].present?
    end

    def parse_statuses
      return OPEN_STATUSES unless unified?

      requested = Array(params[:status]).flat_map { |value| value.to_s.split(",") }.map(&:strip).compact_blank
      return STATUSES if requested.include?(ALL_KEYWORD)

      invalid = requested - STATUSES
      add_error(:status, "charge_filter_invalid_status") if invalid.any? || requested.empty?
      requested.uniq
    end

    def parse_order
      raw = params[:order].presence
      return unified? ? :desc : :asc if raw.nil?

      add_error(:order, "charge_filter_invalid_order") unless ORDERS.include?(raw.to_s)
      raw.to_s.to_sym
    end

    # Month/year and from/to are two ways to say "which due dates"; mixing them is ambiguous, so
    # it is rejected rather than silently picking one.
    def parse_period
      calendar = calendar_period
      range = date_range
      if calendar_params? && range_params?
        add_error(:from, "charge_filter_period_conflict") if params[:from].present?
        add_error(:to, "charge_filter_period_conflict") if params[:to].present?
        return nil
      end

      calendar || range
    end

    def calendar_params?
      params[:month].present? || params[:year].present?
    end

    def range_params?
      params[:from].present? || params[:to].present?
    end

    def calendar_period
      return nil unless calendar_params?

      year = parse_year
      month = parse_month
      add_error(:year, "charge_filter_year_required") if month && params[:year].blank?
      return nil if year.nil? || errors.key?(:year) || errors.key?(:month)

      if month
        first = Date.new(year, month, 1)
        first..first.end_of_month
      else
        Date.new(year, 1, 1)..Date.new(year, 12, 31)
      end
    end

    def parse_year
      return nil if params[:year].blank?

      return params[:year].to_s.to_i if YEAR.match?(params[:year].to_s)

      add_error(:year, "charge_filter_invalid_year")
      nil
    end

    def parse_month
      return nil if params[:month].blank?

      month = params[:month].to_s
      return month.to_i if MONTH.match?(month) && (1..12).cover?(month.to_i)

      add_error(:month, "charge_filter_invalid_month")
      nil
    end

    def date_range
      return nil unless range_params?

      from = parse_date(:from)
      to = parse_date(:to)
      add_error(:to, "charge_filter_range_inverted") if from && to && from > to
      return nil if errors.key?(:from) || errors.key?(:to)

      Range.new(from, to)
    end

    def parse_date(key)
      return nil if params[key].blank?

      value = params[key].to_s
      return Date.iso8601(value) if ISO_DATE.match?(value)

      add_error(key, "charge_filter_invalid_date")
      nil
    rescue Date::Error
      add_error(key, "charge_filter_invalid_date")
      nil
    end

    def add_error(key, i18n_key)
      (errors[key] ||= []) << I18n.t("api.errors.#{i18n_key}")
    end
  end
end
