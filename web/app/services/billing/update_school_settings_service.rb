# frozen_string_literal: true

module Billing
  class UpdateSchoolSettingsService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      record = SchoolBillingSettings.find_or_initialize_by(school: school)
      record.assign_attributes(normalized_params)

      if record.save
        ResponseService.success(data: SchoolSettings.from_record(record))
      else
        ResponseService.failure(code: :validation_error, details: record.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params

    def normalized_params
      attrs = params.slice(
        :overdue_grace_days,
        :service_description,
        :notification_schedule,
        :interest_rate_percent,
        :early_payment_discount_percent,
        :fine_type,
        :fine_rate_percent,
        :fine_amount_cents
      )

      if attrs.key?(:fine_type) && attrs[:fine_type].blank?
        attrs[:fine_type] = nil
        attrs[:fine_rate_percent] = nil
        attrs[:fine_amount_cents] = nil
      elsif attrs[:fine_type] == "percent"
        attrs[:fine_amount_cents] = nil
      elsif attrs[:fine_type] == "fixed"
        attrs[:fine_rate_percent] = nil
      end

      attrs
    end
  end
end
