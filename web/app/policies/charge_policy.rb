# frozen_string_literal: true

class ChargePolicy < ApplicationPolicy
  def index?
    school_staff? || guardian_member?
  end

  def show?
    return school_staff? && record.school_id == school_id if school_staff?

    guardian_member? && record.school_id == school_id && record.guardian_id == Current.guardian.id
  end

  def cancel?
    show?
  end

  def reissue?
    show?
  end

  def destroy?
    show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.where(guardian_id: Current.guardian.id)
      elsif Current.membership&.role == "school" && Current.membership&.active?
        base
      else
        scope.none
      end
    end
  end
end
