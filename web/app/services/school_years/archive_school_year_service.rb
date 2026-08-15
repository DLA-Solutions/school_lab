# frozen_string_literal: true

module SchoolYears
  class ArchiveSchoolYearService < ApplicationService
    def initialize(school_year:)
      @school_year = school_year
    end

    def call
      return archived_failure if school_year.archived?
      return invalid_transition_failure unless school_year.may_archive?

      school_year.archive!
      Platform::EventEmitter.school_year_archived(school: school_year.school, school_year: school_year)

      ResponseService.success(data: school_year.reload)
    end

    private

    attr_reader :school_year

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end

    def invalid_transition_failure
      ResponseService.failure(code: :invalid_state_transition)
    end
  end
end
