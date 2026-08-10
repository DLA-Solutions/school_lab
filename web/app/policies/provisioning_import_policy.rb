# frozen_string_literal: true

class ProvisioningImportPolicy < ApplicationPolicy
  def create?
    provisioning_with?(:provision_school)
  end
end
