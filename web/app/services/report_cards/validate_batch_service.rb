# frozen_string_literal: true

module ReportCards
  # Validates class/period readiness without creating resources (UC-RC02 step 1).
  class ValidateBatchService < ApplicationService
    def initialize(school:, school_class:, academic_period:, force_publish_reason: nil)
      @school = school
      @school_class = school_class
      @academic_period = academic_period
      @force_publish_reason = force_publish_reason
    end

    def call
      students = school_class.students.kept.order(:id)
      readiness = ReadinessValidationService.call(
        school: school,
        school_class: school_class,
        academic_period: academic_period,
        students: students,
        force_publish_reason: force_publish_reason
      )

      if readiness.failure?
        return ResponseService.failure(
          code: readiness.error_code,
          details: readiness.details.merge(
            class_id: school_class.id,
            academic_period_id: academic_period.id,
            ready: false
          )
        )
      end

      ResponseService.success(
        data: {
          class_id: school_class.id,
          academic_period_id: academic_period.id,
          ready: true,
          blockers: []
        }
      )
    end

    private

    attr_reader :school, :school_class, :academic_period, :force_publish_reason
  end
end
