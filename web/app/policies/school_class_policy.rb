# frozen_string_literal: true

class SchoolClassPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)
  def show? = staff_with?(:manage_enrollment) && record.school_id == school_id
  def create? = staff_with?(:manage_enrollment)
  def update? = staff_with?(:manage_enrollment) && record.school_id == school_id

  # A cohort is never deleted. Students, teaching assignments and signed contracts all point at
  # it, so a roll that disappears takes with it the record of who was in it. A cohort that has
  # been superseded is left in place and told apart by its year.
  def destroy? = false

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
