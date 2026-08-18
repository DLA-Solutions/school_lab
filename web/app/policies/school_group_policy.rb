# frozen_string_literal: true

class SchoolGroupPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice? && user.platform_permission?(:manage_multi_unit)

      scope.kept
    end
  end

  def index?
    backoffice? && platform_with?(:manage_multi_unit)
  end

  def show?
    index?
  end

  def create?
    index?
  end

  def update?
    index?
  end

  def destroy?
    index?
  end

  def schools?
    show?
  end

  def assign_school?
    update?
  end

  def unassign_school?
    update?
  end
end
