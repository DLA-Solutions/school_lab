# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # Sent cards for linked children. Drafts are outside the policy scope, and a null
        # answer is omitted from the JSON the family sees.
        class DailyRoutinesController < BaseController
          def index
            authorize DailyRoutine

            routines = filtered_routines.order(date: :desc, id: :desc)
            pagy, records = pagy(routines)

            render json: {
              data: records_json(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            routine = policy_scope(DailyRoutine).includes(:communication_attachments).find(params[:id])
            authorize routine

            render json: { data: record_json(routine) }
          end

          private

          def filtered_routines
            routines = policy_scope(DailyRoutine).includes(:communication_attachments)
            routines = routines.where(student_id: params[:student_id]) if params[:student_id].present?
            routines = routines.where(date: params[:date]) if params[:date].present?
            routines
          end

          def records_json(routines)
            DailyRoutineBlueprint.render_as_hash(routines).map(&:compact)
          end

          def record_json(routine)
            DailyRoutineBlueprint.render_as_hash(routine).compact
          end
        end
      end
    end
  end
end
