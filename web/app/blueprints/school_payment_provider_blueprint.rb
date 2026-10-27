# frozen_string_literal: true

class SchoolPaymentProviderBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :instrument, :provider, :active, :client_id,
         :certificate_fingerprint, :certificate_expires_at, :uploaded_at, :uploaded_by_id

  # Effective Spedy API base URL (stored override or the platform default). Not a secret.
  field :base_url, if: ->(_field, record, _options) { record.provider == "spedy" } do |record, _options|
    Gateways::ServiceInvoice::Spedy::ClientFactory.effective_base_url(record.base_url)
  end
end
