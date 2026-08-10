# frozen_string_literal: true

class MembershipPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_people)
  end

  def create?
    staff_with?(:manage_people)
  end

  def update?
    staff_with?(:manage_people) && record.school_id == school_id
  end

  def destroy?
    update?
  end

  def invite?
    update? && record.invited?
  end

  def update_permissions?
    school_owner? && record.school_id == school_id
  end

  def accept?
    record.user_id == user.id && record.invited?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
