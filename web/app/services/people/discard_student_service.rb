# frozen_string_literal: true

module People
  class DiscardStudentService < ApplicationService
    def initialize(student:, actor:)
      @student = student
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if student.discarded?

      student.update!(discarded_by: actor)
      student.discard

      ResponseService.success
    end

    private

    attr_reader :student, :actor
  end
end
