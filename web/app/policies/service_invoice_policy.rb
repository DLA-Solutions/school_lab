# frozen_string_literal: true

class ServiceInvoicePolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_billing) || guardian_member?
  end

  def show?
    staff_with?(:manage_billing) && record.school_id == school_id || guardian_show?
  end

  def pdf?
    show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.joins(:charge).where(charges: { guardian_id: Current.guardian.id })
      elsif staff_with?(:manage_billing)
        base
      else
        scope.none
      end
    end
  end

  private

  def guardian_show?
    guardian_member? && record.school_id == school_id && record.charge.guardian_id == Current.guardian.id
  end
end
