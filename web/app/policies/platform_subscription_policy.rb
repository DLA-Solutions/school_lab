# frozen_string_literal: true

class PlatformSubscriptionPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice? && user.platform_permission?(:manage_platform_billing)

      scope.kept
    end
  end

  def index?
    backoffice? && platform_with?(:manage_platform_billing)
  end

  def show?
    index?
  end

  def create?
    index?
  end

  def update?
    index?
  end
end
