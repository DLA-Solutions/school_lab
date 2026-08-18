# frozen_string_literal: true

class HelpTaxonomyCategoryPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice? && user.platform_permission?(:configure_help_taxonomy)

      scope.kept
    end
  end

  def index?
    backoffice? && platform_with?(:configure_help_taxonomy)
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

  def destroy?
    index?
  end
end
