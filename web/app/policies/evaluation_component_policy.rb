# frozen_string_literal: true

# Who may read the grade book grid — components, templates, periods, and roster for a class +
# discipline.
#
# `teach` and `manage_enrollment` are two separate keys in the permission catalog
# (`lib/school_lab/permissions.rb`) — the system `teacher` template grants only `teach`, never
# `manage_enrollment`. A teacher grading their own class is the entire point of this endpoint, so
# this is a coarse "holds a grading-relevant permission" gate, not a `manage_enrollment`-only one.
# Teacher-vs-own-class narrowing happens at the controller layer via `ClassDiscipline#teacher_id`
# (`GradeBooksController#teaches?`), not here.
class EvaluationComponentPolicy < ApplicationPolicy
  def index? = staff_with?(:teach) || staff_with?(:manage_enrollment)

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
