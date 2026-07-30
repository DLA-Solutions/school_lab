# frozen_string_literal: true

class BillingPlanPolicy < ApplicationPolicy
  def index?
    school_staff?
  end

  def show?
    school_staff? && record.school_id == school_id
  end

  def create?
    school_staff?
  end

  def update?
    show?
  end

  def destroy?
    show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
