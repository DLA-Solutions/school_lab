# frozen_string_literal: true

class PaymentBlueprint < Blueprinter::Base
  identifier :id

  fields :charge_id, :paid_amount_cents, :payment_method, :provider_payment_id, :paid_at, :status
end
