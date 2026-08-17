# frozen_string_literal: true

module Grades
  # Upserts one grade entry and invalidates the current launch when policy allows.
  class UpsertGradeEntryService < ApplicationService
    def initialize(class_discipline:, academic_period:, evaluation_component:, student:, value:, entered_by_membership:)
      @class_discipline = class_discipline
      @academic_period = academic_period
      @evaluation_component = evaluation_component
      @student = student
      @value = value
      @entered_by_membership = entered_by_membership
    end

    def call
      return period_closed_failure if academic_period.closure_status == "closed"

      entry = nil
      ActiveRecord::Base.transaction do
        entry = GradeEntry.kept.find_or_initialize_by(
          class_discipline: class_discipline,
          academic_period: academic_period,
          evaluation_component: evaluation_component,
          student: student,
          lesson_id: nil,
          activity_id: nil
        )
        entry.assign_attributes(
          school: class_discipline.school,
          value: value,
          entry_kind: evaluation_component.entry_kind,
          entered_by_membership: entered_by_membership
        )
        entry.save!
        InvalidateLaunchService.call(class_discipline: class_discipline, academic_period: academic_period)
      end

      ResponseService.success(data: entry)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :class_discipline, :academic_period, :evaluation_component, :student, :value,
                :entered_by_membership

    def period_closed_failure
      ResponseService.failure(code: :period_closed)
    end
  end
end
