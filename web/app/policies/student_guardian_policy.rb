# frozen_string_literal: true

class StudentGuardianPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_people)
  end

  def create?
    staff_with?(:manage_people)
  end

  def destroy?
    staff_with?(:manage_people) && record.school_id == school_id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
