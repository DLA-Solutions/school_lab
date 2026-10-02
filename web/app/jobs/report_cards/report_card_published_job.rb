# frozen_string_literal: true

module ReportCards
  # Idempotent consumer hook for ReportCardPublished (BR-RC08). Also fans out a BC4 push
  # notification to every guardian of the student whose report card was released (UC-N01) —
  # `MessagePosted` doesn't exist yet, so this is the most natural existing guardian-facing event
  # to wire the push pipeline to; the guardian report-card screen in `mobile/` is the consumer.
  #
  # `channel_key: "report_cards"` is a deliberate extension of the BR-N02 taxonomy — that list is
  # explicitly "e.g." (messages, announcements, service_tickets, attendance, photos), not
  # exhaustive. Flagged for the parent session to ratify or rename once UC-N02 (policy
  # management) ships; the `:notification_policy` factory already defaults to this same key.
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

      notify_guardians(school, snapshot)
    end

    private

    def notify_guardians(school, snapshot)
      student = snapshot.report_card_publication.student
      user_ids = guardian_user_ids_for(student)
      return if user_ids.empty?

      Notifications::ProcessIntentService.call(
        school: school,
        channel_key: "report_cards",
        source_type: "ReportCardSnapshot",
        source_id: snapshot.id,
        target_user_ids: user_ids,
        payload: {
          "title" => I18n.t("notifications.push.report_card_published.title"),
          "body" => I18n.t("notifications.push.report_card_published.body", student: student.name)
        }
      )
    end

    # Guardian#user is optional (BR-N09 scope: a household on file with no platform login yet) —
    # `filter_map` drops those silently rather than enqueueing a delivery nothing can resolve.
    def guardian_user_ids_for(student)
      student.student_guardians.kept.includes(:guardian).filter_map { |link| link.guardian&.user_id }.uniq
    end
  end
end
