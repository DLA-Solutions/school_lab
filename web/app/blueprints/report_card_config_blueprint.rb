# frozen_string_literal: true

class ReportCardConfigBlueprint < Blueprinter::Base
  identifier :id

  fields :version, :template_key, :display_config, :header_text, :footer_text, :document_signatory_id,
         :created_at, :updated_at

  field :signatory do |config|
    config.signatory_snapshot
  end
end
