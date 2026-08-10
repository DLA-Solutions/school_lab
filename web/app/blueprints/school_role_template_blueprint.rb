# frozen_string_literal: true

class SchoolRoleTemplateBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :system_key, :is_system

  view :detail do
    field :permissions do |template|
      RoleTemplatePermissionBlueprint.render_as_hash(template.role_template_permissions.kept)
    end

    field :affected_memberships_count, if: ->(_field_name, _template, options) {
      options.key?(:affected_memberships_count)
    } do |_template, options|
      options[:affected_memberships_count]
    end
  end
end
