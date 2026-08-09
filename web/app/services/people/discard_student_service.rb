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

      # A guardian is on the books because a child of theirs studies here; this was possibly the
      # last one.
      SyncGuardianActivationService.call(student: student, actor: actor)

      ResponseService.success
    end

    private

    attr_reader :student, :actor
  end
end
