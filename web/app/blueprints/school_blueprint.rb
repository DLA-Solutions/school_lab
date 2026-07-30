# frozen_string_literal: true

class SchoolBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :cnpj, :address, :saas_plan, :school_group_id
end
