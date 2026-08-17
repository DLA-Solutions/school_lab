# frozen_string_literal: true

module Grades
  # Marks the current launch invalidated when contributing inputs change after launch.
  class InvalidateLaunchService < ApplicationService
    REASON = "contributing_input_changed"

    def initialize(class_discipline:, academic_period:, reason: REASON)
      @class_discipline = class_discipline
      @academic_period = academic_period
      @reason = reason
    end

    def call
      launch = GradeLaunch.current.find_by(
        school_id: class_discipline.school_id,
        class_discipline: class_discipline,
        academic_period: academic_period
      )
      return ResponseService.success(data: nil) if launch.blank?

      template = EvaluationTemplate.current.find_by(
        school_id: class_discipline.school_id,
        school_class_id: class_discipline.school_class_id,
        academic_period: academic_period
      )
      return ResponseService.success(data: launch) if template&.lock_on_launch?

      launch.update!(
        status: "invalidated",
        invalidated_at: Time.current,
        invalidation_reason: reason
      )

      ResponseService.success(data: launch)
    end

    private

    attr_reader :class_discipline, :academic_period, :reason
  end
end
