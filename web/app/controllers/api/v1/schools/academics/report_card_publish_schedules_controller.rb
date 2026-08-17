# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardPublishSchedulesController < BaseController
          def show
            schedule = policy_scope(ReportCardPublishSchedule).find(params[:id])
            authorize schedule

            render json: {
              data: {
                schedule_id: schedule.id,
                batch_id: schedule.report_card_publish_batch_id,
                scheduled_for: schedule.scheduled_for.iso8601,
                school_timezone: schedule.school_timezone,
                status: schedule.status
              }
            }
          end
        end
      end
    end
  end
end
