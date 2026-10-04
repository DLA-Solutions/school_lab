# frozen_string_literal: true

class SchoolInstructionalDayBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :school_year_id, :date, :instructional
end
