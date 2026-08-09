# frozen_string_literal: true

module People
  # Puts a student back on the roll by hand: one removed by mistake, or one who came back after
  # a transfer. Their guardians follow, through `SyncGuardianActivationService`.
  class ActivateStudentService < ApplicationService
    def initialize(student:, actor: nil)
      @student = student
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless student.discarded?

      student.discarded_by = nil
      student.discarded_at = nil
      # Without validation on purpose: a record that predates a later rule must still be
      # reactivatable, and the school fixes the missing fields afterwards.
      student.save(validate: false)

      # A returning child is exactly the reason to bring the guardians back with them.
      SyncGuardianActivationService.call(student: student, actor: actor)

      Rails.logger.info(
        { event: "student.activated", student_id: student.id, actor_id: actor&.id }.to_json
      )

      ResponseService.success(data: student)
    end

    private

    attr_reader :student, :actor
  end
end
