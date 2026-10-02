# frozen_string_literal: true

# Who may write one grade cell. The upsert endpoint is idempotent create-or-update, so both
# actions allow the same thing: `manage_enrollment` is what the register screens already gate on,
# and a teacher holds it for the classes they teach. Teacher-vs-own-class/discipline narrowing
# happens at the controller/service layer via `ClassDiscipline` lookups.
class GradeEntryPolicy < ApplicationPolicy
  def update? = staff_with?(:manage_enrollment)
  def create? = update?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
