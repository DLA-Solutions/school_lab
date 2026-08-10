# frozen_string_literal: true

class SchoolRoleTemplatePolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_people)
  end

  def create?
    school_owner?
  end

  def update?
    school_owner?
  end

  def destroy?
    school_owner?
  end

  def clone?
    school_owner?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
