# frozen_string_literal: true

module SchoolYears
  class CreateSchoolHolidayService < ApplicationService
    PERMITTED = %i[date name applies_to_attendance].freeze

    def initialize(school_year:, params:)
      @school_year = school_year
      @params = params.to_h.symbolize_keys.slice(*PERMITTED)
    end

    def call
      return archived_failure if school_year.archived?

      holiday = school_year.school_holidays.build(params.merge(school: school_year.school))

      unless holiday.save
        return ResponseService.failure(code: :validation_error, details: holiday.errors.to_hash)
      end

      ResponseService.success(data: holiday)
    end

    private

    attr_reader :school_year, :params

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end
  end
end
