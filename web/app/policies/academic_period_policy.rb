# frozen_string_literal: true

class AcademicPeriodPolicy < ApplicationPolicy
  def index?
    active_staff?
  end

  def create?
    staff_with?(:manage_school_settings)
  end

  def update?
    staff_with?(:manage_school_settings)
  end

  def closure_checklist?
    staff_with?(:manage_academic)
  end

  def start_closure?
    staff_with?(:manage_academic)
  end

  def close?
    staff_with?(:manage_academic)
  end

  def reopen?
    staff_with?(:manage_academic)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end

  private

  def active_staff?
    membership = Current.membership
    membership&.active? && membership.staff_member?
  end
end
