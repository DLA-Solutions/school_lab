# frozen_string_literal: true

class StudentBlueprint < Blueprinter::Base
  identifier :id

  # Whether the record is on the books. Drives the "Ativar" action and the situation filter.
  field :active do |record|
    record.kept?
  end

  # `cpf` is the canonical 11 digits; clients format it for display.
  fields :school_id, :name, :cpf, :rg, :birth_date, :status

  # Whether the child is enrolled in the sense the school means: a contract signed and in force
  # for the current year. `status` says whether they were transferred out; this says whether the
  # paperwork behind their place is actually done.
  field :contract_active do |student|
    student.contract_active?
  end

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
