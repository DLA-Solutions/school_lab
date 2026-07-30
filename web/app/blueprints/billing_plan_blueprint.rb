# frozen_string_literal: true

class BillingPlanBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name, :plan_type, :base_amount
end
