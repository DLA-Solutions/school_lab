# frozen_string_literal: true

class SchoolPaymentProviderBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :instrument, :provider, :active, :client_id,
         :certificate_fingerprint, :certificate_expires_at, :uploaded_at, :uploaded_by_id
end
