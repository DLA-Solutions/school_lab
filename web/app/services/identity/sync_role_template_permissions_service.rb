# frozen_string_literal: true

module Identity
  class SyncRoleTemplatePermissionsService < ApplicationService
    def initialize(template:, permissions:)
      @template = template
      @permissions = permissions
    end

    def call
      normalized = normalize_permissions
      return duplicate_keys_failure if normalized.nil?

      ActiveRecord::Base.transaction do
        sync_permissions!(normalized)
      end

      ResponseService.success(data: template)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :template, :permissions

    def normalize_permissions
      return {} if permissions.blank?

      normalized = {}
      permissions.each do |entry|
        key = entry[:permission_key].to_s
        return nil if normalized.key?(key)

        scope_kind = entry[:scope_kind].presence || default_scope_kind(key)
        return invalid_permission_failure(key, scope_kind) if scope_kind.nil?

        normalized[key] = scope_kind
      end

      normalized
    end

    def default_scope_kind(key)
      catalog_entry = SchoolLab::Permissions::CATALOG[key]
      return nil unless catalog_entry

      catalog_entry[:scope_kinds].include?("full") ? "full" : catalog_entry[:scope_kinds].first
    end

    def invalid_permission_failure(key, scope_kind)
      permission = template.role_template_permissions.build(
        school: template.school,
        permission_key: key,
        scope_kind: scope_kind
      )
      permission.validate
      raise ActiveRecord::RecordInvalid, permission
    end

    def duplicate_keys_failure
      ResponseService.failure(
        code: :validation_error,
        details: { permissions: [ "contains duplicate permission_key values" ] }
      )
    end

    def sync_permissions!(normalized)
      template.role_template_permissions.kept
              .where.not(permission_key: normalized.keys)
              .find_each(&:discard)

      normalized.each do |permission_key, scope_kind|
        upsert_permission!(permission_key, scope_kind)
      end
    end

    def upsert_permission!(permission_key, scope_kind)
      existing = template.role_template_permissions.kept.find_by(permission_key: permission_key)
      if existing
        existing.update!(scope_kind: scope_kind) if existing.scope_kind != scope_kind
        return
      end

      discarded = template.role_template_permissions.discarded.find_by(permission_key: permission_key)
      if discarded
        discarded.undiscard
        discarded.update!(scope_kind: scope_kind)
        return
      end

      template.role_template_permissions.create!(
        school: template.school,
        permission_key: permission_key,
        scope_kind: scope_kind
      )
    end
  end
end
