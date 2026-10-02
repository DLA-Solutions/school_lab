# frozen_string_literal: true

class SubjectPolicy < ApplicationPolicy
  # `teach` and `manage_enrollment` are two separate keys in the permission catalog
  # (`lib/school_lab/permissions.rb`) — the system `teacher` template grants only `teach`, never
  # `manage_enrollment`. A teacher listing the subjects they teach (to pick one for grade entry) is
  # the entire point of this read, so this is a coarse "holds a grading-relevant permission" gate,
  # not a `manage_enrollment`-only one. Teacher-vs-own-class narrowing happens downstream via
  # `ClassDiscipline#teacher_id`, not here.
  def index? = staff_with?(:teach) || staff_with?(:manage_enrollment)
  def show? = staff_with?(:manage_enrollment) && record.school_id == school_id
  def create? = staff_with?(:manage_enrollment)
  def update? = staff_with?(:manage_enrollment) && record.school_id == school_id
  def destroy? = update?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
