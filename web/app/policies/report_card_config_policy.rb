# frozen_string_literal: true

class ReportCardConfigPolicy < ApplicationPolicy
  def show?
    staff_with?(:manage_academic)
  end

  def update?
    staff_with?(:manage_academic)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school && staff_with?(:manage_academic)

      scope.where(school_id: Current.school.id)
    end
  end
end
