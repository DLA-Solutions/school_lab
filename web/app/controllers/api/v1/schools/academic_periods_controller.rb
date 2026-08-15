# frozen_string_literal: true

module Api
  module V1
    module Schools
      class AcademicPeriodsController < BaseController
        before_action :set_school_context!
        before_action :set_school_year, only: %i[index create]
        before_action :set_academic_period, only: :update

        def index
          authorize AcademicPeriod

          periods = policy_scope(AcademicPeriod)
                    .where(school_year: @school_year)
                    .order(:sequence)

          render json: { data: AcademicPeriodBlueprint.render_as_hash(periods) }
        end

        def create
          authorize AcademicPeriod

          result = ::SchoolYears::CreateAcademicPeriodService.call(
            school_year: @school_year,
            params: academic_period_params
          )
          render_service_result(result, success_status: :created) do |period|
            render json: { data: AcademicPeriodBlueprint.render_as_hash(period) }, status: :created
          end
        end

        def update
          authorize @academic_period

          result = ::SchoolYears::UpdateAcademicPeriodService.call(
            academic_period: @academic_period,
            params: academic_period_params
          )
          render_service_result(result) do |updated|
            render json: { data: AcademicPeriodBlueprint.render_as_hash(updated) }
          end
        end

        private

        def set_school_year
          @school_year = policy_scope(SchoolYear).find(params[:school_year_id])
        end

        def set_academic_period
          @academic_period = policy_scope(AcademicPeriod).find(params[:id])
        end

        def academic_period_params
          params.permit(:name, :sequence, :starts_on, :ends_on, :closure_status)
        end
      end
    end
  end
end
