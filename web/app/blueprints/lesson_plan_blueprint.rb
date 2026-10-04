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

  # teacher_id + the human-readable names below exist for the coordination list (UC-LP04) so the
  # admin table can render teacher/subject/class columns without per-row N+1 lookups client-side.
  # `teacher_id` can be nil -- ClassDiscipline#teacher is optional.
  field :teacher_id do |lesson_plan|
    lesson_plan.class_discipline.teacher_id
  end

  field :teacher_name do |lesson_plan|
    lesson_plan.class_discipline.teacher&.name
  end

  field :subject_name do |lesson_plan|
    lesson_plan.class_discipline.subject.name
  end

  field :school_class_name do |lesson_plan|
    lesson_plan.class_discipline.school_class.name
  end
end
