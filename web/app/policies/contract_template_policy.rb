# frozen_string_literal: true

class ContractTemplatePolicy < ApplicationPolicy
  def show? = school_staff?
  def update? = school_staff?
  def preview? = school_staff?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end
end
