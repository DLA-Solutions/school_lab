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

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, idempotency_key: payload[:incident_id], **payload }.to_json)
      end
    end
  end
end
