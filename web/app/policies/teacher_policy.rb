# frozen_string_literal: true

class TeacherPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_people)
  def show? = staff_with?(:manage_people) && record.school_id == school_id
  def create? = staff_with?(:manage_people)
  def update? = staff_with?(:manage_people) && record.school_id == school_id
  def destroy? = update?

  # LUI-6: the collaborator dossier is an export of the whole roster, not a single record read --
  # kept as its own predicate (rather than reusing `index?`) because the two are semantically
  # different actions that happen to share today's gate.
  def dossier? = staff_with?(:manage_people)

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
