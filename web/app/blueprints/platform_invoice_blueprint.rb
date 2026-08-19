# frozen_string_literal: true

class PlatformInvoiceBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :amount_cents, :due_at, :paid_at, :hosted_invoice_url, :payment_method

  view :backoffice do
    fields :provider, :external_invoice_id, :school_id, :platform_subscription_id
  end
end
