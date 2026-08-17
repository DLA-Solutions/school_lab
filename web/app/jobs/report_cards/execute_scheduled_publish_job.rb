# frozen_string_literal: true

module ReportCards
  class ExecuteScheduledPublishJob < ApplicationJob
    queue_as :default

    def perform(schedule_id, school_id)
      school = School.find_by(id: school_id)
      return unless school

      schedule = school.report_card_publish_schedules.find_by(id: schedule_id)
      return unless schedule&.scheduled?

      schedule.update!(status: "processing", executed_at: Time.current)
      ExecuteBatchService.call(batch: schedule.report_card_publish_batch, schedule: schedule)
    end
  end
end
