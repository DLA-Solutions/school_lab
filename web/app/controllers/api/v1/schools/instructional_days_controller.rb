# frozen_string_literal: true

module Api
  module V1
    module Schools
      # Platform-side (BR-SY10): bulk read/write of which calendar dates are instructional for
      # one school year. Academic BC's lesson-plan calendar (Academics::InstructionalDaysController)
      # reads the same table through a thin passthrough.
      class InstructionalDaysController < BaseController
        before_action :set_school_context!
        before_action :set_school_year

        def show
          authorize SchoolInstructionalDay, policy_class: SchoolInstructionalDayPolicy

          days = policy_scope(SchoolInstructionalDay).where(school_year: @school_year).order(:date)

          render json: { data: SchoolInstructionalDayBlueprint.render_as_hash(days) }
        end

        def update
          authorize SchoolInstructionalDay, policy_class: SchoolInstructionalDayPolicy

          result = ::SchoolYears::UpsertInstructionalDaysService.call(
            school_year: @school_year,
            days: instructional_days_params
          )
          render_service_result(result) do |records|
            render json: { data: SchoolInstructionalDayBlueprint.render_as_hash(records) }
          end
        end

        private

        def set_school_year
          @school_year = policy_scope(SchoolYear).find(params[:school_year_id])
        end

        def instructional_days_params
          params.permit(instructional_days: %i[date instructional]).fetch(:instructional_days, []).map do |day|
            day.to_h.symbolize_keys
          end
        end
      end
    end
  end
end
