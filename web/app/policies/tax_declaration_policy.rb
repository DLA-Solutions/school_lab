# frozen_string_literal: true

class TaxDeclarationPolicy < ApplicationPolicy
  def index?
    guardian_member?
  end

  def show?
    guardian_owns_declaration?
  end

  def create?
    guardian_member?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.where(guardian_id: Current.guardian.id)
      else
        scope.none
      end
    end
  end

  private

  def guardian_owns_declaration?
    guardian_member? &&
      record.school_id == school_id &&
      record.guardian_id == Current.guardian.id
  end
end
