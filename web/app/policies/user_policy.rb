# frozen_string_literal: true

class UserPolicy < ApplicationPolicy
  def index?
    backoffice?
  end

  def disable?
    backoffice?
  end

  def enable?
    backoffice?
  end

  class Scope < Scope
    def resolve
      return scope.none unless user&.backoffice?

      scope.all
    end
  end
end
