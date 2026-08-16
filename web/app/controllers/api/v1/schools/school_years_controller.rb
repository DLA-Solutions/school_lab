# frozen_string_literal: true

module Api
  module V1
    module Schools
      class SchoolYearsController < BaseController
        before_action :set_school_context!

        def index
          authorize SchoolYear

          years = filter_status(policy_scope(SchoolYear).order(starts_on: :desc))
          pagy, records = pagy(years)

          render json: {
            data: SchoolYearBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          school_year = policy_scope(SchoolYear).find(params[:id])
          authorize school_year

          render json: { data: render_school_year(school_year) }
        end

        def create
          authorize SchoolYear

          result = ::SchoolYears::CreateSchoolYearService.call(
            school: Current.school,
            params: school_year_params
          )
          render_service_result(result, success_status: :created) do |school_year|
            render json: {
              data: SchoolYearBlueprint.render_as_hash(school_year, view: :with_periods)
            }, status: :created
          end
        end

        def update
          school_year = policy_scope(SchoolYear).find(params[:id])
          authorize school_year

          result = ::SchoolYears::UpdateSchoolYearService.call(
            school_year: school_year,
            params: school_year_params
          )
          render_service_result(result) do |updated|
            render json: { data: SchoolYearBlueprint.render_as_hash(updated) }
          end
        end

        def destroy
          school_year = policy_scope(SchoolYear).find(params[:id])
          authorize school_year

          result = ::SchoolYears::DiscardSchoolYearService.call(school_year: school_year)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        def active
          authorize SchoolYear, :active?

          school_year = policy_scope(SchoolYear).active_status.first
          return render_error(:no_active_school_year, status: :unprocessable_content) if school_year.blank?

          render json: {
            data: SchoolYearBlueprint.render_as_hash(school_year, view: :active)
          }
        end

        def activate
          school_year = policy_scope(SchoolYear).find(params[:id])
          authorize school_year, :activate?

          result = ::SchoolYears::ActivateSchoolYearService.call(school_year: school_year)
          render_service_result(result) do |payload|
            render json: {
              data: {
                id: payload[:school_year].id,
                status: payload[:school_year].status,
                archived_year_id: payload[:archived_year_id]
              }.compact
            }
          end
        end

        def archive
          school_year = policy_scope(SchoolYear).find(params[:id])
          authorize school_year, :archive?

          result = ::SchoolYears::ArchiveSchoolYearService.call(school_year: school_year)
          render_service_result(result) do |updated|
            render json: { data: SchoolYearBlueprint.render_as_hash(updated) }
          end
        end

        private

        def school_year_params
          params.permit(:name, :starts_on, :ends_on, :period_template)
        end

        def filter_status(scope)
          status = params[:status].to_s.presence
          return scope unless status.in?(SchoolYear::STATUSES)

          scope.where(status: status)
        end

        def render_school_year(school_year)
          view = nil
          includes = params[:include].to_s.split(",").map(&:strip)
          if includes.include?("periods") && includes.include?("holidays")
            view = :active
          elsif includes.include?("periods")
            view = :with_periods
          elsif includes.include?("holidays")
            view = :with_holidays
          end

          SchoolYearBlueprint.render_as_hash(school_year, view: view)
        end
      end
    end
  end
end
