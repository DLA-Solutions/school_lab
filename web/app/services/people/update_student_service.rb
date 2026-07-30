# frozen_string_literal: true

module People
  class UpdateStudentService < ApplicationService
    def initialize(student:, params:)
      @student = student
      @params = params
    end

    def call
      if student.update(params)
        ResponseService.success(data: student)
      else
        ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
      end
    end

    private

    attr_reader :student, :params
  end
end
