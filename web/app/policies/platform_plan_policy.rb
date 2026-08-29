# frozen_string_literal: true

class PlatformPlanPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.kept if backoffice_billing? || staff_with?(:manage_school_settings)

      scope.none
    end

    private

    def backoffice_billing?
      user&.backoffice? && user.platform_permission?(:manage_platform_billing)
    end
  end

  def index?
    backoffice? && platform_with?(:manage_platform_billing)
  end

  def index_own?
    staff_with?(:manage_school_settings)
  end
end
