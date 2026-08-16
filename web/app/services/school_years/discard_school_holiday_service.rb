# frozen_string_literal: true

module SchoolYears
  class DiscardSchoolHolidayService < ApplicationService
    def initialize(school_holiday:)
      @school_holiday = school_holiday
    end

    def call
      return archived_failure if school_holiday.school_year.archived?

      school_holiday.discard
      ResponseService.success
    end

    private

    attr_reader :school_holiday

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end
  end
end
