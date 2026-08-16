# frozen_string_literal: true

module SchoolLab
  module PlatformPermissions
    CATALOG = {
      "provision_school" => {
        domain: "onboarding",
        description: "Configure schools while onboarding_status is provisioning"
      }.freeze,
      "manage_backoffice_ops" => {
        domain: "platform",
        description: "Tenant module toggles and backoffice operations"
      }.freeze
    }.freeze

    module_function

    def known_key?(key)
      CATALOG.key?(key.to_s)
    end

    def keys
      CATALOG.keys
    end
  end
end
