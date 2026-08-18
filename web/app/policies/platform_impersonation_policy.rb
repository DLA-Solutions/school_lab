# frozen_string_literal: true

class PlatformImpersonationPolicy < ApplicationPolicy
  def create?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end

  def destroy?
    create?
  end
end
