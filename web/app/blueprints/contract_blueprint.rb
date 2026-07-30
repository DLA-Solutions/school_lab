# frozen_string_literal: true

class ContractBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :student_id, :billing_plan_id, :negotiated_amount, :due_day,
         :starts_on, :ends_on, :status
end
