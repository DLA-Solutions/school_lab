# frozen_string_literal: true

class SchoolPlatformSubscriptionPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.none unless staff_with?(:manage_school_settings)

      scope.kept.where(school_id: Current.school&.id)
    end
  end

  def show?
    staff_with?(:manage_school_settings) && same_school?
  end

  def checkout?
    show?
  end

  def change_plan?
    show?
  end

  def cancel?
    show?
  end

  def invoices?
    show?
  end

  private

  def same_school?
    return true if record == :school_platform_subscription
    return true if record.nil?
    return record.id == Current.school&.id if record.is_a?(School)

    record.school_id == Current.school&.id
  end
end
