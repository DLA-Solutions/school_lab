# frozen_string_literal: true

class BillingPurposePolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_billing)
  end

  def create?
    staff_with?(:manage_billing)
  end

  def update?
    staff_with?(:manage_billing) && record.school_id == school_id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id).kept
    end
  end
end
