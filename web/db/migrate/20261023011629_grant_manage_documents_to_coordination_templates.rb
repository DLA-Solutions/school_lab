# frozen_string_literal: true

# Product decision (BR-ARC14): Coordenação holds `manage_documents` so it can inactivate and list
# inactive documents. New schools get it from SchoolLab::Permissions::SYSTEM_TEMPLATES; this gives
# the same default to schools provisioned earlier.
#
# Only the kept system `coordination` template of each school is touched, and only when it has no
# `manage_documents` row at all: a row that exists (even a discarded one) means the school already
# decided, so its choice is left alone. The insert is idempotent and tenant-bound (`school_id` is
# copied from the template).
class GrantManageDocumentsToCoordinationTemplates < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      INSERT INTO role_template_permissions
        (role_template_id, school_id, permission_key, scope_kind, created_at, updated_at)
      SELECT t.id, t.school_id, 'manage_documents', 'full', NOW(), NOW()
      FROM school_role_templates t
      WHERE t.system_key = 'coordination'
        AND t.is_system = TRUE
        AND t.discarded_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM role_template_permissions p
          WHERE p.role_template_id = t.id AND p.permission_key = 'manage_documents'
        )
    SQL
  end

  # Restores the previous default (coordination without `manage_documents`). Grants a school made
  # on purpose before this migration are indistinguishable from the ones inserted here, so `down`
  # removes the kept `manage_documents` row of every system coordination template.
  def down
    execute <<~SQL.squish
      DELETE FROM role_template_permissions
      WHERE permission_key = 'manage_documents'
        AND discarded_at IS NULL
        AND role_template_id IN (
          SELECT id FROM school_role_templates
          WHERE system_key = 'coordination' AND is_system = TRUE AND discarded_at IS NULL
        )
    SQL
  end
end
