# frozen_string_literal: true

class ChargePolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_billing) || guardian_member?
  end

  def show?
    return staff_with?(:manage_billing) && record.school_id == school_id if Current.membership&.staff_member?

    guardian_member? && record.school_id == school_id && record.guardian_id == Current.guardian.id
  end

  def cancel?
    show?
  end

  def reissue?
    show?
  end

  # The PDF carries the payer's name, CPF and address: the guardian who owns the charge, or school
  # staff with billing permission in the same school (who already see the payer's CPF in the
  # listing). Same boundary as `show?`; cross-school and cross-family stay out via `Scope`.
  def boleto_pdf?
    show?
  end

  def generate?
    staff_with?(:manage_billing)
  end

  # Raising a charge by hand is staff work; a guardian may only read their own.
  def create?
    staff_with?(:manage_billing)
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
      elsif staff_with?(:manage_billing)
        base
      else
        scope.none
      end
    end
  end
end
