# frozen_string_literal: true

class PlatformAnalyticsOverviewPolicy < ApplicationPolicy
  def show?
    backoffice? && (platform_with?(:view_analytics_dashboard) || platform_with?(:manage_backoffice_ops))
  end
end
