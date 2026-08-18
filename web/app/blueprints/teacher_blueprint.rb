# frozen_string_literal: true

class TeacherBlueprint < Blueprinter::Base
  identifier :id

  # `cpf` is the canonical 11 digits; clients format it for display.
  fields :school_id, :name, :cpf, :email, :phone, :hired_on

  # The address, for the same reasons the guardian's is kept: a contract, a payroll registration,
  # anything mailed to them. Every part is optional and often blank.
  fields(*Teacher::ADDRESS_FIELDS)

  field :job_position_id

  # The post's name, so a listing reads without resolving the association client-side.
  field :job_title do |teacher|
    teacher.job_position&.name
  end

  # The listing answers "which classes, and which subjects in each" in one row, so the screen
  # never has to fan out a request per teacher.
  view :with_assignments do
    field :classes do |teacher|
      teacher.teaching_assignments.kept.group_by(&:school_class).map do |school_class, assignments|
        {
          id: school_class.id,
          name: school_class.name,
          grade_level: school_class.grade_level,
          shift: school_class.shift,
          year: school_class.year,
          subjects: assignments.map do |assignment|
            { id: assignment.subject.id, name: assignment.subject.name, assignment_id: assignment.id }
          end
        }
      end
    end
  end
end
