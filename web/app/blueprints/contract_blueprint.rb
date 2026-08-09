# frozen_string_literal: true

class ContractBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :student_id, :billing_plan_id, :negotiated_amount_cents, :due_day,
         :starts_on, :ends_on, :status, :signature_status, :sent_at, :signed_at

  # Saves the contract list a lookup per row just to name the child it belongs to.
  field :student_name do |contract|
    contract.student&.name
  end
end
