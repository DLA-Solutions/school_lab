# frozen_string_literal: true

# One subject taught to one cohort — the unit the grade book reads and writes against. Narrowing
# to a teacher's own disciplines happens at the controller layer via `teacher_id`; this policy
# only holds the floor everyone shares: the same school, the same `manage_enrollment` permission
# the rest of the grading surface gates on.
class ClassDisciplinePolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)
  def show? = index?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
