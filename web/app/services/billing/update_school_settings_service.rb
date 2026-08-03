# frozen_string_literal: true

module Billing
  class UpdateSchoolSettingsService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      record = SchoolBillingSettings.find_or_initialize_by(school: school)
      record.assign_attributes(permitted_params)

      if record.save
        ResponseService.success(data: SchoolSettings.from_record(record))
      else
        ResponseService.failure(code: :validation_error, details: record.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params

    def permitted_params
      params.slice(:overdue_grace_days, :service_description, :notification_schedule, :interest_rate_percent)
    end
  end
end
