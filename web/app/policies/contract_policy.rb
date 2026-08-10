# frozen_string_literal: true

class ContractPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_billing)
  end

  def show?
    staff_with?(:manage_billing) && record.school_id == school_id
  end

  def create?
    staff_with?(:manage_billing)
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
