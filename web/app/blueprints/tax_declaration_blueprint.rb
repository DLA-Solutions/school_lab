# frozen_string_literal: true

class TaxDeclarationBlueprint < Blueprinter::Base
  field :tax_declaration_id do |declaration|
    declaration.id
  end

  field :calendar_year

  field :active_version_id

  association :active_version, blueprint: TaxDeclarationVersionBlueprint, name: :version do |declaration, options|
    declaration.active_version if options[:include_version]
  end
end
