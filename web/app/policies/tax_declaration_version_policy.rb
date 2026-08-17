# frozen_string_literal: true

class TaxDeclarationVersionPolicy < ApplicationPolicy
  def index?
    guardian_member?
  end

  def show?
    guardian_owns_version?
  end

  def pdf?
    show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.joins(:tax_declaration).where(tax_declarations: { guardian_id: Current.guardian.id })
      else
        scope.none
      end
    end
  end

  private

  def guardian_owns_version?
    guardian_member? &&
      record.school_id == school_id &&
      record.tax_declaration.guardian_id == Current.guardian.id
  end
end
