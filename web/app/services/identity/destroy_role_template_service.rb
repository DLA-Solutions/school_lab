# frozen_string_literal: true

module Identity
  class DestroyRoleTemplateService < ApplicationService
    def initialize(template:)
      @template = template
    end

    def call
      return ResponseService.failure(code: :cannot_delete_system_template) if template.is_system?

      if template.staff_profiles.kept.exists?
        count = template.affected_memberships_count
        return ResponseService.failure(code: :template_in_use, details: { count: count })
      end

      if template.admin_capable? && !other_admin_capable_templates_exist?
        return ResponseService.failure(code: :last_admin_template)
      end

      ActiveRecord::Base.transaction do
        template.role_template_permissions.kept.find_each(&:discard)
        template.discard
      end

      ResponseService.success
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :template

    def other_admin_capable_templates_exist?
      SchoolRoleTemplate.school_has_admin_capable_template?(school: template.school, excluding: template)
    end
  end
end
