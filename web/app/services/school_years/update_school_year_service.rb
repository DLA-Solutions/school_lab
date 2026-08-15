# frozen_string_literal: true

module SchoolYears
  class UpdateSchoolYearService < ApplicationService
    PERMITTED = %i[name starts_on ends_on].freeze

    def initialize(school_year:, params:)
      @school_year = school_year
      @params = params.to_h.symbolize_keys.slice(*PERMITTED)
    end

    def call
      return archived_failure if school_year.archived?
      return draft_only_failure unless school_year.draft?
      return template_immutable_failure if params.key?(:period_template)

      unless school_year.update(params)
        return ResponseService.failure(code: :validation_error, details: school_year.errors.to_hash)
      end

      ResponseService.success(data: school_year.reload)
    end

    private

    attr_reader :school_year, :params

    def archived_failure
      ResponseService.failure(code: :archived_school_year)
    end

    def draft_only_failure
      ResponseService.failure(code: :invalid_state_transition, details: { requirement: "draft_year" })
    end

    def template_immutable_failure
      ResponseService.failure(
        code: :validation_error,
        details: { period_template: [ "cannot be changed after create" ] }
      )
    end
  end
end
