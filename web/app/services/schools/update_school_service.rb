# frozen_string_literal: true

module Schools
  class UpdateSchoolService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      if school.update(params.to_h.symbolize_keys.except(:saas_plan))
        ResponseService.success(data: school)
      else
        ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params
  end
end
