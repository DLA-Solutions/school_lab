# frozen_string_literal: true

class LessonPlanBlueprint < Blueprinter::Base
  identifier :id

  fields :class_discipline_id, :date,
         :duration, :unit_stage, :topic, :general_objective, :specific_objectives,
         :bncc_competencies, :other_competencies, :resources_materials,
         :assessment_types, :assessment_formats

  field :school_class_id do |lesson_plan|
    lesson_plan.class_discipline.school_class_id
  end

  field :subject_id do |lesson_plan|
    lesson_plan.class_discipline.subject_id
  end
end
