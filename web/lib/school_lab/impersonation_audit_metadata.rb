# frozen_string_literal: true

module SchoolLab
  module ImpersonationAuditMetadata
    STORE_KEY = :impersonation_audit_comment

    module_function

    def comment_for(session:)
      return unless session&.active?

      {
        impersonating: true,
        impersonation_session_id: session.id,
        operator_user_id: session.operator_user_id,
        target_user_id: session.target_user_id,
        school_id: session.school_id
      }.to_json
    end

    def current_comment
      Audited.store[STORE_KEY]
    end

    def with_comment(session:)
      Audited.store[STORE_KEY] = comment_for(session: session)
      yield
    ensure
      Audited.store.delete(STORE_KEY)
    end
  end
end
