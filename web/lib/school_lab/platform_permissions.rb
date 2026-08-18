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
      }.freeze,
      "manage_multi_unit" => {
        domain: "platform",
        description: "Manage school groups and campus assignments"
      }.freeze,
      "manage_platform_billing" => {
        domain: "platform",
        description: "Manage SaaS plans and school subscriptions"
      }.freeze,
      "view_analytics_dashboard" => {
        domain: "platform",
        description: "View aggregate platform analytics"
      }.freeze,
      "configure_help_taxonomy" => {
        domain: "platform",
        description: "Manage help center taxonomy categories"
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
