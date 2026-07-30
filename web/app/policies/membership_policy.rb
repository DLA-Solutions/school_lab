# frozen_string_literal: true

class MembershipPolicy < ApplicationPolicy
  def index?
    school_staff?
  end

  def create?
    school_staff?
  end

  def update?
    school_staff? && record.school_id == school_id
  end

  def destroy?
    update?
  end

  def invite?
    update? && record.invited?
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
