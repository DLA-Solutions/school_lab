# frozen_string_literal: true

class SchoolPolicy < ApplicationPolicy
  def index?
    backoffice?
  end

  def show?
    backoffice?
  end

  def create?
    backoffice?
  end

  def update?
    backoffice?
  end

  def destroy?
    backoffice?
  end

  class Scope < Scope
    def resolve
      return scope.all if user&.backoffice?

      scope.none
    end
  end
end
