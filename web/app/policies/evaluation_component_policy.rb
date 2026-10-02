# frozen_string_literal: true

# Who may read the grade book grid — components, templates, periods, and roster for a class +
# discipline. `manage_enrollment` is what the register screens already gate on, and a teacher
# holds it for the classes they teach; teacher-vs-own-class narrowing happens at the controller
# layer via `ClassDiscipline` lookups.
class EvaluationComponentPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
