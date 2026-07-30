# frozen_string_literal: true

module Schools
  class DiscardSchoolService < ApplicationService
    def initialize(school:, actor:)
      @school = school
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if school.discarded?

      school.update!(discarded_by: actor)
      school.discard

      ResponseService.success
    end

    private

    attr_reader :school, :actor
  end
end
