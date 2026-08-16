# frozen_string_literal: true

module Api
  module V1
    module Schools
      class HolidaysController < BaseController
        before_action :set_school_context!
        before_action :set_school_year, only: %i[index create]
        before_action :set_holiday, only: %i[update destroy]

        def index
          authorize SchoolHoliday, policy_class: HolidayPolicy

          holidays = policy_scope(SchoolHoliday)
                     .where(school_year: @school_year)
                     .order(:date)

          render json: { data: SchoolHolidayBlueprint.render_as_hash(holidays) }
        end

        def create
          authorize SchoolHoliday, policy_class: HolidayPolicy

          result = ::SchoolYears::CreateSchoolHolidayService.call(
            school_year: @school_year,
            params: holiday_params
          )
          render_service_result(result, success_status: :created) do |holiday|
            render json: { data: SchoolHolidayBlueprint.render_as_hash(holiday) }, status: :created
          end
        end

        def update
          authorize @holiday, policy_class: HolidayPolicy

          result = ::SchoolYears::UpdateSchoolHolidayService.call(
            school_holiday: @holiday,
            params: holiday_params
          )
          render_service_result(result) do |updated|
            render json: { data: SchoolHolidayBlueprint.render_as_hash(updated) }
          end
        end

        def destroy
          authorize @holiday, policy_class: HolidayPolicy

          result = ::SchoolYears::DiscardSchoolHolidayService.call(school_holiday: @holiday)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        private

        def set_school_year
          @school_year = policy_scope(SchoolYear).find(params[:school_year_id])
        end

        def set_holiday
          @holiday = policy_scope(SchoolHoliday).find(params[:id])
        end

        def holiday_params
          params.permit(:date, :name, :applies_to_attendance)
        end
      end
    end
  end
end
