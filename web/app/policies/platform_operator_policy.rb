# frozen_string_literal: true

class PlatformOperatorPolicy < ApplicationPolicy
  def index?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end
end
