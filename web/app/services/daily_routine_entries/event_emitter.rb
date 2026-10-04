# frozen_string_literal: true

module DailyRoutineEntries
  # BR-DR05 / UC-DR03: the mandatory domain event for the one real `draft -> sent` transition.
  # Mirrors Incidents::EventEmitter#incident_published exactly — same log-then-enqueue shape, same
  # idempotency contract (the caller, SendDailyRoutineEntryService, only ever calls this once per
  # entry, on the genuine first transition).
  class EventEmitter
    class << self
      def routine_sent(entry:)
        log_event("DailyRoutineSent", daily_routine_entry_id: entry.id, school_id: entry.school_id)
        DailyRoutineEntries::RoutineSentJob.perform_later(entry.id, entry.school_id)
      end

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, idempotency_key: payload[:daily_routine_entry_id], **payload }.to_json)
      end
    end
  end
end
