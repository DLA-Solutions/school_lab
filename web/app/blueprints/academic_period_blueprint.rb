# frozen_string_literal: true

class AcademicPeriodBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :sequence, :starts_on, :ends_on, :closure_status
end
