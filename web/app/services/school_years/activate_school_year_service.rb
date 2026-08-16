# frozen_string_literal: true

module SchoolYears
  class ActivateSchoolYearService < ApplicationService
    def initialize(school_year:)
      @school_year = school_year
    end

    def call
      return archived_failure if school_year.archived?
      return invalid_transition_failure unless school_year.draft?
      return missing_periods_failure if school_year.academic_periods.kept.none?
      return period_overlap_failure if periods_overlap?

      archived_year_id = nil
      success = false

      ActiveRecord::Base.transaction do
        prior_active = school_year.school.school_years.kept.active_status.first
        if prior_active.present?
          unless prior_active.may_archive?
            raise ActiveRecord::Rollback
          end

          prior_active.archive!
          Platform::EventEmitter.school_year_archived(school: school_year.school, school_year: prior_active)
          archived_year_id = prior_active.id
        end

        unless school_year.may_activate?
          raise ActiveRecord::Rollback
        end

        school_year.activate!
        success = true
      end

      return invalid_transition_failure unless success

      Platform::EventEmitter.school_year_activated(
        school: school_year.school,
        school_year: school_year,
        archived_year_id: archived_year_id
      )

      ResponseService.success(data: { school_year: school_year, archived_year_id: archived_year_id })
    rescue ActiveRecord::StatementInvalid => e
      mapped = PersistenceErrors.map(e)
      mapped || raise
    end

    private

    attr_reader :school_year

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end

    def invalid_transition_failure
      ResponseService.failure(code: :invalid_state_transition)
    end

    def missing_periods_failure
      ResponseService.failure(
        code: :invalid_state_transition,
        details: { requirement: "at_least_one_period" }
      )
    end

    def period_overlap_failure
      ResponseService.failure(code: :period_overlap)
    end

    def periods_overlap?
      ranges = school_year.academic_periods.kept.order(:starts_on).pluck(:starts_on, :ends_on)
      ranges.each_cons(2).any? { |(_, ends_on), (next_starts_on, _)| next_starts_on <= ends_on }
    end
  end
end
