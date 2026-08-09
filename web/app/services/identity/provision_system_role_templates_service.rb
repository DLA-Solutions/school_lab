# frozen_string_literal: true

module Identity
  class ProvisionSystemRoleTemplatesService < ApplicationService
    def initialize(school:)
      @school = school
    end

    def call
      unless school&.persisted?
        return ResponseService.failure(
          code: :validation_error,
          details: { school: [ "must be persisted" ] }
        )
      end

      templates = {}

      ActiveRecord::Base.transaction do
        SchoolLab::Permissions::SYSTEM_TEMPLATES.each do |system_key, definition|
          template = find_or_create_system_template!(system_key, definition)
          ensure_permissions!(template, definition[:permissions])
          templates[system_key] = template
        end
      end

      ResponseService.success(data: { templates: templates })
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school

    def find_or_create_system_template!(system_key, definition)
      school.school_role_templates.kept.find_by(system_key: system_key) ||
        school.school_role_templates.create!(
          name: definition[:default_name],
          system_key: system_key,
          is_system: true
        )
    end

    def ensure_permissions!(template, permissions)
      permissions.each do |permission|
        permission_key = permission[:key]
        scope_kind = permission[:scope_kind]

        next if template.role_template_permissions.kept.exists?(permission_key: permission_key)

        template.role_template_permissions.create!(
          school: school,
          permission_key: permission_key,
          scope_kind: scope_kind
        )
      end
    end
  end
end
