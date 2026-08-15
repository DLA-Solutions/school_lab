# frozen_string_literal: true

module Platform
  class EventEmitter
    class << self
      def school_year_activated(school:, school_year:, archived_year_id: nil)
        payload = {
          school_id: school.id,
          school_year_id: school_year.id,
          archived_year_id: archived_year_id
        }.compact
        log_event("SchoolYearActivated", payload)
        Platform::SchoolYearActivatedJob.perform_later(payload.stringify_keys)
      end

      def school_year_archived(school:, school_year:)
        payload = { school_id: school.id, school_year_id: school_year.id }
        log_event("SchoolYearArchived", payload)
        Platform::SchoolYearArchivedJob.perform_later(payload.stringify_keys)
      end

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, **payload }.to_json)
      end
    end
  end
end
