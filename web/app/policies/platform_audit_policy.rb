# frozen_string_literal: true

class PlatformAuditPolicy < ApplicationPolicy
  def index?
    backoffice? && platform_with?(:manage_backoffice_ops)
  end
end
