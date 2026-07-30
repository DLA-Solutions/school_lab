# frozen_string_literal: true

module Schools
  class CreateSchoolService < ApplicationService
    def initialize(params:)
      @params = params
    end

    def call
      school = School.new(params)

      if school.save
        ResponseService.success(data: school)
      else
        ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
      end
    end

    private

    attr_reader :params
  end
end
