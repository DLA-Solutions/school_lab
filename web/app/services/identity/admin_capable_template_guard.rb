# frozen_string_literal: true

module Identity
  class AdminCapableTemplateGuard < ApplicationService
    def initialize(school:, template:, proposed_permission_keys:)
      @school = school
      @template = template
      @proposed_permission_keys = proposed_permission_keys.map(&:to_s)
    end

    def call
      if SchoolRoleTemplate.school_has_admin_capable_template?(
        school: school,
        excluding: template,
        replacement_keys_for: proposed_permission_keys
      )
        ResponseService.success
      else
        ResponseService.failure(code: :last_admin_template)
      end
    end

    private

    attr_reader :school, :template, :proposed_permission_keys
  end
end
