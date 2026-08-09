# frozen_string_literal: true

class SchoolClassBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name, :grade_level, :year

  field :student_count do |school_class|
    school_class.students.kept.size
  end

  # The subjects taught in this cohort — derived from its teaching assignments, since a subject
  # enters a class by being assigned to someone.
  view :with_subjects do
    association :subjects, blueprint: SubjectBlueprint
  end
end
