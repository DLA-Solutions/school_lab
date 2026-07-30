# frozen_string_literal: true

class StudentBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name, :birth_date, :status
end
