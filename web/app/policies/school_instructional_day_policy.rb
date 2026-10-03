# frozen_string_literal: true

class SchoolInstructionalDayPolicy < ApplicationPolicy
  def show?
    active_staff?
  end

  def update?
    staff_with?(:manage_school_settings)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end

  private

  def active_staff?
    membership = Current.membership
    membership&.active? && membership.staff_member?
  end
end
