# frozen_string_literal: true

class SchoolGroupBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :headquarters_cnpj, :created_at, :updated_at

  field :schools_count do |group|
    group.schools.kept.count
  end
end
