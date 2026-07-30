# frozen_string_literal: true

class UserPolicy < ApplicationPolicy
  def disable?
    backoffice?
  end

  def enable?
    backoffice?
  end
end
