# frozen_string_literal: true

class PlatformPlanPolicy < ApplicationPolicy
  def index?
    backoffice? && platform_with?(:manage_platform_billing)
  end
end
