# frozen_string_literal: true

class ProvisioningImportBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :row_count, :committed_at, :created_at

  field :error_report do |import|
    import.error_report
  end
end
