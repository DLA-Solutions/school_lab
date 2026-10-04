# frozen_string_literal: true

module Incidents
  # Idempotent consumer hook for IncidentPublished (BR-IN06). Also fans out a BC4 push
  # notification to every guardian of the student the published incident is about — mirrors
  # ReportCards::ReportCardPublishedJob exactly, the established pattern in this codebase for an
  # optional domain event with an unresolved communication-consumer question.
  #
  # `channel_key: "incidents"` is a deliberate extension of the BR-N02 taxonomy — that list is
  # explicitly "e.g." (messages, announcements, service_tickets, attendance, photos), not
  # exhaustive. Flagged for the parent session to ratify or rename once UC-N02 (policy
  # management) ships, exactly like ReportCardPublishedJob already extended it with
  # "report_cards".
  class IncidentPublishedJob < ApplicationJob
    queue_as :default

    def perform(incident_id, school_id)
      school = School.find_by(id: school_id)
      return unless school

      # No `school.incidents` association is declared on `School` (same gap as
      # `IncidentType`/`school.incident_types`) — scope explicitly instead.
      incident = Incident.find_by(id: incident_id, school_id: school.id)
      return unless incident

      Rails.logger.info(
        { event: "IncidentPublishedJob", incident_id: incident.id, school_id: school.id }.to_json
      )

      notify_guardians(school, incident)
    end

    private

    def notify_guardians(school, incident)
      student = incident.student
      user_ids = guardian_user_ids_for(student)
      return if user_ids.empty?

      Notifications::ProcessIntentService.call(
        school: school,
        channel_key: "incidents",
        source_type: "Incident",
        source_id: incident.id,
        target_user_ids: user_ids,
        payload: {
          "title" => I18n.t("notifications.push.incident_published.title"),
          "body" => I18n.t("notifications.push.incident_published.body", student: student.name)
        }
      )
    end

    # Guardian#user is optional (BR-N09 scope: a household on file with no platform login yet) —
    # `filter_map` drops those silently rather than enqueueing a delivery nothing can resolve.
    # Same defensive pattern as ReportCardPublishedJob#guardian_user_ids_for.
    def guardian_user_ids_for(student)
      student.student_guardians.kept.includes(:guardian).filter_map { |link| link.guardian&.user_id }.uniq
    end
  end
end
