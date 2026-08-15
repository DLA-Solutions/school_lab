# frozen_string_literal: true

class SchoolClassPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)
  def show? = staff_with?(:manage_enrollment) && record.school_id == school_id
  def create? = staff_with?(:manage_enrollment)
  def update? = staff_with?(:manage_enrollment) && record.school_id == school_id

  # Deleting a cohort is a discard, not an erase: teaching assignments and any contract that named
  # it keep pointing at a row that still exists. The controller refuses while students are still
  # enrolled, since that is what would leave children unattached.
  def destroy? = update?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
