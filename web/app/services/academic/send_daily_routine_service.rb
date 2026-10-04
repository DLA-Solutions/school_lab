# frozen_string_literal: true

module Academic
  # Marks the card sent and posts exactly one kind-routine line. The message body stays empty:
  # the card is the routine row, not a copy of the narrative. Attachments stay on the routine.
  class SendDailyRoutineService < ApplicationService
    def initialize(school:, membership:, routine:)
      @school = school
      @membership = membership
      @routine = routine
    end

    def call
      return ResponseService.failure(code: :not_found) unless routine.school_id == school.id
      return ResponseService.failure(code: :not_found) unless routine.student.school_id == school.id
      return ResponseService.failure(code: :routine_day_locked) if routine.date < DailyRoutine.today
      return ResponseService.failure(code: :not_infantil) unless routine.school_class&.infantil?

      message = nil
      error = nil

      ActiveRecord::Base.transaction do
        routine.lock!
        if already_published?
          error = :routine_already_sent
          raise ActiveRecord::Rollback
        end
        unless routine.content_present?
          error = :empty_content
          raise ActiveRecord::Rollback
        end

        sent_at = Time.current
        routine.update!(status: "sent", sent_at: sent_at)
        conversation = Communication::EnsureKeptConversation.call(school: school, student: routine.student)
        message = Message.create!(
          conversation: conversation,
          school: school,
          sender_membership: membership,
          kind: "routine",
          body: nil,
          daily_routine: routine,
          sent_at: sent_at
        )
        conversation.update!(last_message_at: sent_at)
      end

      return ResponseService.failure(code: error) if error

      ResponseService.success(data: { routine: routine, message: message, created: true })
    rescue ActiveRecord::RecordNotUnique
      ResponseService.failure(code: :routine_already_sent)
    end

    private

    attr_reader :school, :membership, :routine

    def already_published?
      routine.sent? || Message.exists?(daily_routine_id: routine.id)
    end
  end
end
