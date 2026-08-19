# frozen_string_literal: true

class PlatformInvoicePolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      if user&.backoffice? && user.platform_permission?(:manage_platform_billing)
        return scope.all
      end

      return scope.none unless staff_with?(:manage_school_settings) && Current.school

      scope.where(school_id: Current.school.id)
    end
  end

  def index?
    backoffice? && platform_with?(:manage_platform_billing) || staff_with?(:manage_school_settings)
  end

  def show?
    index? && (backoffice? || record.school_id == Current.school&.id)
  end
end
