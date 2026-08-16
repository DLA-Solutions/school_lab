# frozen_string_literal: true

# Who may read and record marks.
#
# `manage_enrollment` is what the register screens already gate on, and a teacher holds it for the
# classes they teach. The scope is what keeps a teacher to their own lessons: the permission says
# they may mark, the scope says whose.
class GradePolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)
  def update? = index?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
