# frozen_string_literal: true

class StudentGuardianPolicy < ApplicationPolicy
  def index?
    school_staff?
  end

  def create?
    school_staff?
  end

  def destroy?
    school_staff? && record.school_id == school_id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
