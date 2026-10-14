# frozen_string_literal: true

class CrmContactBlueprint < Blueprinter::Base
  identifier :id

  view :summary do
    fields :name, :phone, :email, :notes, :temperature
  end

  view :detail do
    include_view :summary
    fields :school_id, :created_at, :updated_at
  end
end
