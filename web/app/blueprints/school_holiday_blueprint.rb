# frozen_string_literal: true

class SchoolHolidayBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :school_year_id, :date, :name, :applies_to_attendance
end
