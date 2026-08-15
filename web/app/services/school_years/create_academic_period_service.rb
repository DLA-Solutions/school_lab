# frozen_string_literal: true

module SchoolYears
  class CreateAcademicPeriodService < ApplicationService
    PERMITTED = %i[name sequence starts_on ends_on].freeze

    def initialize(school_year:, params:)
      @school_year = school_year
      @params = params.to_h.symbolize_keys.slice(*PERMITTED)
    end

    def call
      return archived_failure if school_year.archived?
      return draft_only_failure unless school_year.draft?

      period = school_year.academic_periods.build(params.merge(school: school_year.school))

      unless period.save
        code = period.errors.details.values.flatten.any? { |detail| detail[:error] == :invalid_period_range } ? :invalid_period_range : :validation_error
        return ResponseService.failure(code: code, details: period.errors.to_hash)
      end

      ResponseService.success(data: period)
    rescue ActiveRecord::StatementInvalid => e
      mapped = PersistenceErrors.map(e, record: period)
      mapped || raise
    end

    private

    attr_reader :school_year, :params

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end

    def draft_only_failure
      ResponseService.failure(code: :invalid_state_transition, details: { requirement: "draft_year" })
    end
  end
end
