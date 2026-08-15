# frozen_string_literal: true

module SchoolYears
  class UpdateAcademicPeriodService < ApplicationService
    PERMITTED = %i[name starts_on ends_on].freeze

    def initialize(academic_period:, params:)
      @academic_period = academic_period
      @params = params.to_h.symbolize_keys
    end

    def call
      school_year = academic_period.school_year

      return archived_failure if school_year.archived?
      return draft_only_failure unless school_year.draft?
      return closure_status_failure if params.key?(:closure_status)

      unless academic_period.update(params.slice(*PERMITTED))
        code = academic_period.errors.details.values.flatten.any? { |detail| detail[:error] == :invalid_period_range } ? :invalid_period_range : :validation_error
        return ResponseService.failure(code: code, details: academic_period.errors.to_hash)
      end

      ResponseService.success(data: academic_period.reload)
    rescue ActiveRecord::StatementInvalid => e
      mapped = PersistenceErrors.map(e, record: academic_period)
      mapped || raise
    end

    private

    attr_reader :academic_period, :params

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end

    def draft_only_failure
      ResponseService.failure(code: :invalid_state_transition, details: { requirement: "draft_year" })
    end

    def closure_status_failure
      ResponseService.failure(
        code: :validation_error,
        details: { closure_status: [ "is read-only on Platform routes" ] }
      )
    end
  end
end
