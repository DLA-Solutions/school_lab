# frozen_string_literal: true

# One lesson as the school thinks of it: a teacher, a subject, and the cohort they teach it to.
# The three together are the unit, so the listing is of assignments rather than of teachers with
# their classes folded underneath.
class TeachingAssignmentBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :teacher_id, :school_class_id, :subject_id

  field :teacher_name do |assignment|
    assignment.teacher.name
  end

  field :subject_name do |assignment|
    assignment.subject.name
  end

  # Denormalized so a row reads without a join on the client. The cohort's own naming — grade,
  # letter, shift and year — is what identifies it; the letter alone repeats everywhere.
  field :school_class do |assignment|
    school_class = assignment.school_class

    {
      id: school_class.id,
      name: school_class.name,
      grade_level: school_class.grade_level,
      shift: school_class.shift,
      year: school_class.year,
      label: school_class.full_name
    }
  end
end
