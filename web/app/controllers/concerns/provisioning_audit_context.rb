# frozen_string_literal: true

# Sets provisioning audit metadata on audited changes during backoffice CRUD
# while a school is in provisioning status.
module ProvisioningAuditContext
  extend ActiveSupport::Concern

  included do
    before_action :store_provisioning_audit_comment
    after_action :clear_provisioning_audit_comment
  end

  private

  def store_provisioning_audit_comment
    comment = SchoolLab::ProvisioningAuditMetadata.comment
    return if comment.blank?

    Audited.store[SchoolLab::ProvisioningAuditMetadata::STORE_KEY] = comment
  end

  def clear_provisioning_audit_comment
    Audited.store.delete(SchoolLab::ProvisioningAuditMetadata::STORE_KEY)
  end
end
