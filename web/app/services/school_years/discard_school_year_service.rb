# frozen_string_literal: true

module SchoolYears
  class DiscardSchoolYearService < ApplicationService
    def initialize(school_year:)
      @school_year = school_year
    end

    def call
      in_use = YearInUseGuard.call(school_year: school_year)
      return in_use if in_use.failure?

      school_year.discard
      ResponseService.success
    end

    private

    attr_reader :school_year
  end
end
