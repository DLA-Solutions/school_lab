# frozen_string_literal: true

# Who may write one grade cell. The upsert endpoint is idempotent create-or-update, so both
# actions allow the same thing.
#
# `teach` and `manage_enrollment` are two separate keys in the permission catalog
# (`lib/school_lab/permissions.rb`) — the system `teacher` template grants only `teach`, never
# `manage_enrollment`. A teacher recording their own class's grades is the entire point of this
# endpoint, so this is a coarse "holds a grading-relevant permission" gate, not a
# `manage_enrollment`-only one. Teacher-vs-own-class/discipline narrowing happens at the
# controller/service layer via `ClassDiscipline#teacher_id`.
class GradeEntryPolicy < ApplicationPolicy
  def update? = staff_with?(:teach) || staff_with?(:manage_enrollment)
  def create? = update?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
