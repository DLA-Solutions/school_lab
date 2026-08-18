# frozen_string_literal: true

class AuditBlueprint < Blueprinter::Base
  identifier :id

  fields :action, :auditable_type, :auditable_id, :comment

  field :created_at do |audit|
    audit.created_at&.iso8601
  end

  field :school_id do |audit|
    Platform::AuditSchoolResolver.call(audit)
  end

  field :actor do |audit|
    next nil if audit.user_id.blank?

    {
      id: audit.user_id,
      type: audit.user_type
    }
  end

  field :changed_keys do |audit|
    SchoolLab::AuditPiiRedactor.changed_keys(audit.audited_changes)
  end

  field :audited_changes do |audit|
    SchoolLab::AuditPiiRedactor.call(audit.audited_changes)
  end
end
