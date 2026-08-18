# frozen_string_literal: true

# Tenant-scoped change auditing via the audited gem.
# Include on models with `belongs_to :school` — see docs/guidelines/web/auditing.md.
module SchoolAuditable
  extend ActiveSupport::Concern

  AUDITED_EXCEPT = %w[created_at updated_at].freeze

  included do
    audited associated_with: :school, except: AUDITED_EXCEPT

    before_create :assign_provisioning_audit_comment, prepend: true
    before_update :assign_provisioning_audit_comment, prepend: true
    before_destroy :assign_provisioning_audit_comment, prepend: true
  end

  private

  def assign_provisioning_audit_comment
    comment = SchoolLab::ProvisioningAuditMetadata.current_comment ||
              SchoolLab::BackofficeAuditMetadata.current_comment ||
              SchoolLab::ImpersonationAuditMetadata.current_comment
    self.audit_comment = comment if comment.present?
  end
end
