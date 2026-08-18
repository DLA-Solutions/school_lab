# frozen_string_literal: true

class HelpTaxonomyCategoryBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :slug, :module_key, :persona_tags, :position, :created_at, :updated_at
end
