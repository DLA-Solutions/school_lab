# frozen_string_literal: true

class SchoolClassPolicy < ApplicationPolicy
  # `teach` and `manage_enrollment` are two separate keys in the permission catalog
  # (`lib/school_lab/permissions.rb`) — the system `teacher` template grants only `teach`, never
  # `manage_enrollment`. A teacher listing the classes they teach (to pick one for grade entry) is
  # the entire point of this read, so this is a coarse "holds a grading-relevant permission" gate,
  # not a `manage_enrollment`-only one. Teacher-vs-own-class narrowing happens downstream via
  # `ClassDiscipline#teacher_id`, not here.
  def index? = staff_with?(:teach) || staff_with?(:manage_enrollment)
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
