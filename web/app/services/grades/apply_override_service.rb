# frozen_string_literal: true

module Grades
  # Appends a secretary override and invalidates the current launch when policy allows.
  class ApplyOverrideService < ApplicationService
    def initialize(class_discipline:, academic_period:, student:, computed_value:, override_value:,
                   reason_code:, applied_by_membership:)
      @class_discipline = class_discipline
      @academic_period = academic_period
      @student = student
      @computed_value = computed_value
      @override_value = override_value
      @reason_code = reason_code
      @applied_by_membership = applied_by_membership
    end

    def call
      return period_closed_failure if academic_period.closure_status == "closed"

      override = nil
      ActiveRecord::Base.transaction do
        prior = GradeOverride.current.find_by(
          school_id: class_discipline.school_id,
          student: student,
          class_discipline: class_discipline,
          academic_period: academic_period
        )
        prior&.update!(superseded_at: Time.current)

        override = GradeOverride.create!(
          school: class_discipline.school,
          student: student,
          class_discipline: class_discipline,
          academic_period: academic_period,
          computed_value: computed_value,
          override_value: override_value,
          reason_code: reason_code,
          applied_by_membership: applied_by_membership,
          supersedes: prior
        )

        InvalidateLaunchService.call(class_discipline: class_discipline, academic_period: academic_period)
      end

      ResponseService.success(data: override)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :class_discipline, :academic_period, :student, :computed_value, :override_value,
                :reason_code, :applied_by_membership

    def period_closed_failure
      ResponseService.failure(code: :period_closed)
    end
  end
end
