# frozen_string_literal: true

class PaymentBlueprint < Blueprinter::Base
  identifier :id

  fields :charge_id, :paid_amount, :payment_method, :psp_transaction_id, :paid_at, :status
end
