# frozen_string_literal: true

class TaxDeclarationSettingBlueprint < Blueprinter::Base
  field :id
  field :school_id

  fields :configuration_version,
         :approved_purpose_configuration_digest,
         :legal_text,
         :legal_text_version,
         :legal_accounting_approved_at

  field :document_signatory_id

  field :purpose_configuration do |settings|
    Billing::PurposeConfigurationDigest.snapshot_for(settings.school).fetch(:purposes)
  end

  field :persisted do |settings|
    settings.persisted?
  end
end
