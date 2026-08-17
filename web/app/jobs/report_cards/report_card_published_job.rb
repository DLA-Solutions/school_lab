# frozen_string_literal: true

module ReportCards
  # Idempotent consumer hook for ReportCardPublished (BR-RC08).
  class ReportCardPublishedJob < ApplicationJob
    queue_as :default

    def perform(snapshot_id, school_id)
      school = School.find_by(id: school_id)
      return unless school

      snapshot = school.report_card_snapshots.find_by(id: snapshot_id)
      return unless snapshot

      Rails.logger.info(
        { event: "ReportCardPublishedJob", snapshot_id: snapshot.id, school_id: school.id }.to_json
      )
    end
  end
end
