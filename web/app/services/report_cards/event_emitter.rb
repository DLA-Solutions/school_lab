# frozen_string_literal: true

module ReportCards
  class EventEmitter
    class << self
      def report_card_published(snapshot:)
        log_event("ReportCardPublished", snapshot_id: snapshot.id, publication_id: snapshot.report_card_publication_id)
        ReportCards::ReportCardPublishedJob.perform_later(snapshot.id, snapshot.school_id)
      end

      def report_card_republished(snapshot:)
        log_event("ReportCardRepublished", snapshot_id: snapshot.id, publication_id: snapshot.report_card_publication_id)
        ReportCards::ReportCardPublishedJob.perform_later(snapshot.id, snapshot.school_id)
      end

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, idempotency_key: payload[:snapshot_id], **payload }.to_json)
      end
    end
  end
end
