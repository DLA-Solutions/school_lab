# frozen_string_literal: true

class PaymentPolicy < ApplicationPolicy
  def index?
    school_staff? || guardian_member?
  end

  def show?
    return school_staff? && record.school_id == school_id if school_staff?

    guardian_member? && record.school_id == school_id && record.charge.guardian_id == Current.guardian.id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.joins(:charge).where(charges: { guardian_id: Current.guardian.id })
      elsif Current.membership&.role == "school" && Current.membership&.active?
        base
      else
        scope.none
      end
    end
  end
end
