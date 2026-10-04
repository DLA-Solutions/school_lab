# frozen_string_literal: true

module LessonPlans
  class UpsertLessonPlanService < ApplicationService
    # BR-LP07 template fields — all optional (AC-LP05). `attributes` carries whichever of these
    # the caller passed; missing keys are left untouched on an existing row rather than nulled out.
    TEMPLATE_FIELDS = %i[
      duration unit_stage topic general_objective specific_objectives bncc_competencies
      other_competencies resources_materials assessment_types assessment_formats
    ].freeze

    def initialize(class_discipline:, date:, attributes: {})
      @class_discipline = class_discipline
      @date = date
      @attributes = attributes
    end

    def call
      return ResponseService.failure(code: :non_instructional_day) unless instructional_day?

      lesson_plan = LessonPlan.find_or_initialize_by(class_discipline: class_discipline, date: date)
      lesson_plan.assign_attributes(template_attributes)

      unless lesson_plan.save
        return ResponseService.failure(code: :validation_error, details: lesson_plan.errors.to_hash)
      end

      ResponseService.success(data: lesson_plan)
    end

    private

    attr_reader :class_discipline, :date, :attributes

    def template_attributes
      attributes.to_h.symbolize_keys.slice(*TEMPLATE_FIELDS)
    end

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
