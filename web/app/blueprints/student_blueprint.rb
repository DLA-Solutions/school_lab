# frozen_string_literal: true

class StudentBlueprint < Blueprinter::Base
  identifier :id

  # `cpf` is the canonical 11 digits; clients format it for display.
  fields :school_id, :name, :cpf, :rg, :birth_date, :status

  field :school_class_id

  # Derived from the cohort the student is enrolled into.
  field :grade_level do |student|
    student.school_class&.grade_level
  end

  field :school_class_name do |student|
    student.school_class&.name
  end

  # The parents, so a listing can show them without a request per student.
  field :guardians do |student|
    student.student_guardians.kept.map do |link|
      {
        id: link.guardian_id,
        link_id: link.id,
        name: link.guardian.name,
        cpf: link.guardian.cpf,
        relationship: link.relationship
      }
    end
  end

  view :guardian do
    fields :name
  end
end
