# frozen_string_literal: true

module Identity
  class CloneRoleTemplateService < ApplicationService
    def initialize(source_template:, name:)
      @source_template = source_template
      @name = name
    end

    def call
      permissions = source_template.role_template_permissions.kept.map do |permission|
        {
          permission_key: permission.permission_key,
          scope_kind: permission.scope_kind
        }
      end

      CreateRoleTemplateService.call(
        school: source_template.school,
        params: { name: name, permissions: permissions }
      )
    end

    private

    attr_reader :source_template, :name
  end
end
