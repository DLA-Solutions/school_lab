# frozen_string_literal: true

class ContractTemplatePolicy < ApplicationPolicy
  def show? = staff_with?(:manage_billing)
  def update? = staff_with?(:manage_billing)
  def preview? = staff_with?(:manage_billing)

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end
end
