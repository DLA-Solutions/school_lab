# frozen_string_literal: true

module DailyRoutineEntries
  # Idempotent consumer hook for DailyRoutineSent (BR-DR05). Fans out an in-app notification to
  # every guardian of the student the sent entry is about — mirrors
  # Incidents::IncidentPublishedJob exactly.
  #
  # `channel_key: "daily_routine"` is a deliberate extension of the BR-N02 taxonomy, same kind of
  # extension IncidentPublishedJob made with "incidents".
  class RoutineSentJob < ApplicationJob
    queue_as :default

    def perform(entry_id, school_id)
      school = School.find_by(id: school_id)
      return unless school

      # No `school.daily_routine_entries` association is declared on `School` (same gap noted in
      # IncidentPublishedJob) — scope explicitly instead.
      entry = DailyRoutineEntry.find_by(id: entry_id, school_id: school.id)
      return unless entry

      Rails.logger.info(
        { event: "DailyRoutineSentJob", daily_routine_entry_id: entry.id, school_id: school.id }.to_json
      )

      notify_guardians(school, entry)
    end

    private

    def notify_guardians(school, entry)
      student = entry.student
      user_ids = guardian_user_ids_for(student)
      return if user_ids.empty?

      Notifications::ProcessIntentService.call(
        school: school,
        channel_key: "daily_routine",
        source_type: "DailyRoutineEntry",
        source_id: entry.id,
        target_user_ids: user_ids,
        payload: {
          "title" => I18n.t("notifications.push.daily_routine_sent.title"),
          "body" => I18n.t("notifications.push.daily_routine_sent.body", student: student.name)
        }
      )
    end

    # Guardian#user is optional (BR-N09 scope) — filter_map drops those silently, same defensive
    # pattern as IncidentPublishedJob#guardian_user_ids_for.
    def guardian_user_ids_for(student)
      student.student_guardians.kept.includes(:guardian).filter_map { |link| link.guardian&.user_id }.uniq
    end
  end
end
