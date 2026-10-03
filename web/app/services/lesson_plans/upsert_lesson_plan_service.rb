# frozen_string_literal: true

module LessonPlans
  class UpsertLessonPlanService < ApplicationService
    def initialize(class_discipline:, date:, content:)
      @class_discipline = class_discipline
      @date = date
      @content = content
    end

    def call
      return ResponseService.failure(code: :non_instructional_day) unless instructional_day?

      lesson_plan = LessonPlan.find_or_initialize_by(class_discipline: class_discipline, date: date)
      lesson_plan.content = content

      unless lesson_plan.save
        return ResponseService.failure(code: :validation_error, details: lesson_plan.errors.to_hash)
      end

      ResponseService.success(data: lesson_plan)
    end

    private

    attr_reader :class_discipline, :date, :content

    # BR-LP03: a date with no SchoolInstructionalDay row ("undecided") is treated the same as
    # `instructional: false` — never guessed as instructional.
    def instructional_day?
      SchoolInstructionalDay.exists?(
        school_year_id: class_discipline.school_year_id,
        date: date,
        instructional: true
      )
    end
  end
end
