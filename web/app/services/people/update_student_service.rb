# frozen_string_literal: true

module People
  class UpdateStudentService < ApplicationService
    def initialize(student:, params:, actor: nil)
      @student = student
      @params = params
      @actor = actor
    end

    def call
      if student.update(params)
        # `status` can move to `transferred` here, which is the other way a child stops
        # attending — the guardians follow either way.
        SyncGuardianActivationService.call(student: student, actor: actor)

        ResponseService.success(data: student)
      else
        ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
      end
    end

    private

    attr_reader :student, :params, :actor
  end
end
