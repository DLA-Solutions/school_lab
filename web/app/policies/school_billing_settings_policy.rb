# frozen_string_literal: true

class SchoolBillingSettingsPolicy < ApplicationPolicy
  def show?
    school_staff? && record.school_id == school_id
  end

  def update?
    show?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end
end
