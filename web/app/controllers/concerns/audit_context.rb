# frozen_string_literal: true

# Sets the audited gem's current user from the API request context.
# Include in the API base controller once JWT auth lands.
module AuditContext
  extend ActiveSupport::Concern

  included do
    before_action :set_audit_user
  end

  private

  def set_audit_user
    return unless defined?(Current)

    if Current.impersonation_session&.active?
      Audited.store[:audited_user] = Current.impersonation_operator
      comment = SchoolLab::ImpersonationAuditMetadata.comment_for(session: Current.impersonation_session)
      Audited.store[SchoolLab::ImpersonationAuditMetadata::STORE_KEY] = comment if comment.present?
      return
    end

    return unless Current.user

    Audited.store[:audited_user] = Current.user
  end
end
