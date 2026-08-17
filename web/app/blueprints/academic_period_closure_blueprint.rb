# frozen_string_literal: true

class AcademicPeriodClosureBlueprint < Blueprinter::Base
  field :period_id
  field :closure_status
  field :stage
  field :complete
  field :blockers
end
