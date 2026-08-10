# frozen_string_literal: true

class SchoolRoleTemplateBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :system_key, :is_system
end
