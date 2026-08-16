# frozen_string_literal: true

class SchoolModulePolicy < ApplicationPolicy
  def update?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end

  class Scope < Scope
    def resolve
      return scope.all if user&.backoffice? && user.platform_permission?(:manage_backoffice_ops)

      scope.none
    end
  end
end
