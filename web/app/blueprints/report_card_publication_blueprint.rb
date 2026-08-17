# frozen_string_literal: true

class ReportCardPublicationBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :academic_period_id, :active_snapshot_id, :created_at, :updated_at

  field :active_snapshot do |publication, options|
    next unless publication.active_snapshot

    ReportCardSnapshotBlueprint.render_as_hash(
      publication.active_snapshot,
      school_id: options[:school_id] || publication.school_id
    )
  end
end
