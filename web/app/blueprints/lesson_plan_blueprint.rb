# frozen_string_literal: true

class LessonPlanBlueprint < Blueprinter::Base
  identifier :id

  fields :class_discipline_id, :date, :content

  field :school_class_id do |lesson_plan|
    lesson_plan.class_discipline.school_class_id
  end

  field :subject_id do |lesson_plan|
    lesson_plan.class_discipline.subject_id
  end
end
