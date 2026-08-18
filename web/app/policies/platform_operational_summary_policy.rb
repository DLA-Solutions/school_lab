# frozen_string_literal: true

class PlatformOperationalSummaryPolicy < ApplicationPolicy
  def show?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end
end
