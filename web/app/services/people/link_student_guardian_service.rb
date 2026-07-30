# frozen_string_literal: true

module People
  class LinkStudentGuardianService < ApplicationService
    def initialize(school:, student:, params:)
      @school = school
      @student = student
      @params = params
    end

    def call
      guardian = school.guardians.kept.find(params[:guardian_id])
      link = school.student_guardians.build(
        guardian: guardian,
        student: student,
        financial_percentage: params[:financial_percentage],
        primary_guardian: params[:primary_guardian]
      )

      if link.save
        ResponseService.success(data: link)
      else
        ResponseService.failure(code: :validation_error, details: link.errors.to_hash)
      end
    rescue ActiveRecord::RecordNotFound
      ResponseService.failure(code: :not_found)
    end

    private

    attr_reader :school, :student, :params
  end
end
