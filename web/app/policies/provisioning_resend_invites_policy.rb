# frozen_string_literal: true

class ProvisioningResendInvitesPolicy < ApplicationPolicy
  def create?
    backoffice? && platform_with?(:provision_school) && record.provisioning?
  end
end
