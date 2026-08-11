# frozen_string_literal: true

module SchoolLab
  # Thread-local audit comment for backoffice CRUD during school provisioning.
  # See docs/modeling/004-school-onboarding.md § Provisioning audit.
  module ProvisioningAuditMetadata
    STORE_KEY = :provisioning_audit_comment

    module_function

    def applicable?
      user = Current.user
      user&.backoffice? &&
        user.platform_permission?(:provision_school) &&
        Current.school&.provisioning?
    end

    def comment
      return unless applicable?

      {
        actor_type: "backoffice",
        on_behalf_of: Current.school.id
      }.to_json
    end

    def current_comment
      Audited.store[STORE_KEY]
    end

    def with_comment
      Audited.store[STORE_KEY] = comment if applicable?
      yield
    ensure
      Audited.store.delete(STORE_KEY)
    end
  end
end
