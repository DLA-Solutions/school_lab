# frozen_string_literal: true

module SchoolYears
  class CreateSchoolYearService < ApplicationService
    PERMITTED = %i[name starts_on ends_on period_template].freeze

    def initialize(school:, params:)
      @school = school
      @params = params.to_h.symbolize_keys.slice(*PERMITTED)
    end

    def call
      school_year = school.school_years.build(params)
      school_year.period_template ||= "trimester"

      ActiveRecord::Base.transaction do
        unless school_year.save
          return ResponseService.failure(code: :validation_error, details: school_year.errors.to_hash)
        end

        build_template_periods!(school_year)
      end

      school_year.reload
      ResponseService.success(data: school_year)
    rescue ActiveRecord::StatementInvalid => e
      mapped = PersistenceErrors.map(e, record: school_year)
      mapped || raise
    end

    private

    attr_reader :school, :params

    def build_template_periods!(school_year)
      return if school_year.period_template == "custom"

      PeriodTemplateBuilder.build(school_year: school_year, template: school_year.period_template).each do |attrs|
        period = school_year.academic_periods.build(attrs.merge(school: school))
        period.save!
      end
    end
  end
end
