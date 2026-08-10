# frozen_string_literal: true

class SchoolTransactionPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_billing)
  def create? = staff_with?(:manage_billing)
  def update? = staff_with?(:manage_billing) && record.school_id == school_id
  def destroy? = update?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
