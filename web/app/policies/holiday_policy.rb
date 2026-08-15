# frozen_string_literal: true

class HolidayPolicy < ApplicationPolicy
  def index?
    active_staff?
  end

  def create?
    staff_with?(:manage_school_settings)
  end

  def update?
    staff_with?(:manage_school_settings)
  end

  def destroy?
    staff_with?(:manage_school_settings)
  end

  private

  def active_staff?
    membership = Current.membership
    membership&.active? && membership.staff_member?
  end
end
