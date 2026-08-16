# frozen_string_literal: true

class ReportCardSnapshotBlueprint < Blueprinter::Base
  identifier :id

  fields :version, :released_at, :correction_reason, :grade_launch_digest, :supersedes_id

  field :snapshot do |record|
    record.snapshot
  end

  field :config_version do |record|
    record.report_card_config.version
  end

  field :pdf_url do |record, options|
    school_id = options[:school_id] || record.school_id
    publication_id = record.report_card_publication_id
    "/api/v1/schools/#{school_id}/me/report_cards/#{publication_id}/snapshots/#{record.id}/pdf"
  end
end
