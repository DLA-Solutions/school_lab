# frozen_string_literal: true

class UnmatchedBoletoPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_billing)
  end

  def resolve?
    staff_with?(:manage_billing)
  end

  def dismiss?
    staff_with?(:manage_billing)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school
      return scope.none unless staff_with?(:manage_billing)

      scope.where(school_id: Current.school.id)
    end
  end
end
