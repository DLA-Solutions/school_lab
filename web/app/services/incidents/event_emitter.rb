# frozen_string_literal: true

module Incidents
  # Optional domain event (BR-IN06): "whether communication consumes it is unresolved" — same
  # unresolved-consumer shape as ReportCards::EventEmitter#report_card_published. Mirrors that
  # convention exactly rather than inventing a different mechanism for this domain.
  class EventEmitter
    class << self
      def incident_published(incident:)
        log_event("IncidentPublished", incident_id: incident.id, school_id: incident.school_id)
        Incidents::IncidentPublishedJob.perform_later(incident.id, incident.school_id)
      end

      # Mandatory domain event (BR-IN09 / UC-IN04): every incident creation notifies whichever
      # BR-IN08 approval slot(s) still need a holder. Unlike `incident_published` above, this is
      # not optional and not guardian-facing — it fans out to staff only, via the same
      # NotificationIntent pipeline.
      def incident_created(incident:)
        log_event("IncidentCreated", incident_id: incident.id, school_id: incident.school_id)
        Incidents::IncidentCreatedJob.perform_later(incident.id, incident.school_id)
      end

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, idempotency_key: payload[:incident_id], **payload }.to_json)
      end
    end
  end
end
