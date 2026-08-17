# frozen_string_literal: true

class ServiceInvoiceBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :integration_id, :provider, :provider_document_id,
         :invoice_number, :verification_code, :access_key,
         :payment_id, :charge_id, :authorized_at, :enqueued_at, :failed_at

  field :pdf_available do |invoice|
    invoice.pdf.attached?
  end
end
