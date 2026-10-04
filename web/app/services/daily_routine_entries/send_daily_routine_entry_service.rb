# frozen_string_literal: true

module DailyRoutineEntries
  # draft -> sent (UC-DR03). Idempotent (BR-DR04/AC-DR04): calling this again on an already-`sent`
  # entry is a no-op success — no second `sent_at`/`sent_by_membership_id` stamp, and critically no
  # second call to EventEmitter, which is what actually guards against a duplicate guardian
  # notification (BR-DR05).
  class SendDailyRoutineEntryService < ApplicationService
    def initialize(entry:, sent_by_membership:)
      @entry = entry
      @sent_by_membership = sent_by_membership
    end

    def call
      return ResponseService.success(data: entry) if entry.sent?

      entry.status = "sent"
      entry.sent_at = Time.current
      entry.sent_by_membership = sent_by_membership

      unless entry.save
        return ResponseService.failure(code: :validation_error, details: entry.errors.to_hash)
      end

      DailyRoutineEntries::EventEmitter.routine_sent(entry: entry)

      ResponseService.success(data: entry)
    end

    private

    attr_reader :entry, :sent_by_membership
  end
end
