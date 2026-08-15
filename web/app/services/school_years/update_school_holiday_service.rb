# frozen_string_literal: true

module SchoolYears
  class UpdateSchoolHolidayService < ApplicationService
    PERMITTED = %i[date name applies_to_attendance].freeze

    def initialize(school_holiday:, params:)
      @school_holiday = school_holiday
      @params = params.to_h.symbolize_keys.slice(*PERMITTED)
    end

    def call
      return archived_failure if school_holiday.school_year.archived?

      unless school_holiday.update(params)
        return ResponseService.failure(code: :validation_error, details: school_holiday.errors.to_hash)
      end

      ResponseService.success(data: school_holiday.reload)
    end

    private

    attr_reader :school_holiday, :params

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end
  end
end
