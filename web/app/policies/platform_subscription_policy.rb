# frozen_string_literal: true

class PlatformSubscriptionPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice? && user.platform_permission?(:manage_platform_billing)

      scope.kept
    end
  end

  def index?
    backoffice_billing?
  end

  def show?
    backoffice_billing? || school_settings_for_record?
  end

  def create?
    backoffice_billing?
  end

  def update?
    backoffice_billing?
  end

  def checkout?
    backoffice_billing? || school_settings_for_record?
  end

  def change_plan?
    checkout?
  end

  def cancel?
    checkout?
  end

  def invoices?
    show?
  end

  def show_own?
    staff_with?(:manage_school_settings)
  end

  def checkout_own?
    show_own?
  end

  def change_plan_own?
    show_own?
  end

  def cancel_own?
    show_own?
  end

  def invoices_own?
    show_own?
  end

  private

  def backoffice_billing?
    backoffice? && platform_with?(:manage_platform_billing)
  end

  def school_settings_for_record?
    return false unless staff_with?(:manage_school_settings)
    return false unless record.respond_to?(:school_id)

    record.school_id == Current.school&.id
  end
end
