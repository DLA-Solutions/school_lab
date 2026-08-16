# frozen_string_literal: true

module SchoolLab
  # Thread-local audit comment for backoffice module operations (BR-BO06).
  module BackofficeAuditMetadata
    STORE_KEY = :backoffice_audit_comment

    module_function

    def comment_for(school:)
      user = Current.user
      return unless user&.backoffice? && user.platform_permission?(:manage_backoffice_ops) && school&.persisted?

      {
        actor_type: "backoffice",
        school_id: school.id
      }.to_json
    end

    def current_comment
      Audited.store[STORE_KEY]
    end

    def with_comment(school:)
      Audited.store[STORE_KEY] = comment_for(school: school)
      yield
    ensure
      Audited.store.delete(STORE_KEY)
    end
  end
end
