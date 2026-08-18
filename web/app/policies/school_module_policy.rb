# frozen_string_literal: true

class SchoolModulePolicy < ApplicationPolicy
  def show?
    manage_backoffice_ops?
  end

  def update?
    manage_backoffice_ops?
  end

  class Scope < Scope
    def resolve
      return scope.all if user&.backoffice? && user.platform_permission?(:manage_backoffice_ops)

      scope.none
    end
  end

  private

  def manage_backoffice_ops?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end
end
