# frozen_string_literal: true

class UnmatchedBoletoBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :provider, :provider_invoice_id, :payer_cpf, :payer_name, :amount_cents,
         :due_date, :provider_status, :status, :resolved_at, :resolved_guardian_id, :charge_id,
         :created_at
end
