# frozen_string_literal: true

module Schools
  class RestoreSchoolService < ApplicationService
    def initialize(school:, actor:)
      @school = school
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :not_discarded) unless school.discarded?

      school.update!(discarded_by: nil)
      school.undiscard

      ResponseService.success(data: school)
    end

    private

    attr_reader :school, :actor
  end
end
