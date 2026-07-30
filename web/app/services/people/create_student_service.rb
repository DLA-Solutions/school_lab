# frozen_string_literal: true

module People
  class CreateStudentService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      student = school.students.build(params)

      if student.save
        ResponseService.success(data: student)
      else
        ResponseService.failure(code: :validation_error, details: student.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params
  end
end
