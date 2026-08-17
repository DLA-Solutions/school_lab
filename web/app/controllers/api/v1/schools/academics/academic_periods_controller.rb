# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class AcademicPeriodsController < BaseController
          before_action :set_period

          def closure_checklist
            authorize @period, :closure_checklist?

            stage = params[:stage].presence || AcademicPeriods::ClosureChecklistService::STAGE_PRE_CLOSING
            result = AcademicPeriods::ClosureChecklistService.call(period: @period, stage: stage)

            render_service_result(result, success_status: :ok) do |data|
              render json: { data: AcademicPeriodClosureBlueprint.render_as_hash(data) }
            end
          end

          def start_closure
            authorize @period, :start_closure?

            result = AcademicPeriods::StartClosureService.call(period: @period)

            render_service_result(result, success_status: :ok) do |period|
              render json: { data: AcademicPeriodBlueprint.render_as_hash(period) }
            end
          end

          private

          def set_period
            @period = policy_scope(AcademicPeriod).find(params[:id])
          end
        end
      end
    end
  end
end
