# frozen_string_literal: true

class ChargeBlueprint < Blueprinter::Base
  identifier :id

  fields :billing_period, :original_amount, :discount_amount, :total_amount, :due_date, :status

  field :student do |charge|
    student = charge.contract.student
    { id: student.id, name: student.name }
  end

  field :guardian do |charge|
    { id: charge.guardian.id, name: charge.guardian.name }
  end
end
