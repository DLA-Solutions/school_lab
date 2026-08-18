# frozen_string_literal: true

module Api
  module V1
    module Platform
      class SchoolGroupsController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def index
          authorize SchoolGroup

          result = ::Platform::ListSchoolGroupsService.call
          return render_service_result(result) unless result.success?

          pagy, records = pagy(result.data)
          render json: {
            data: SchoolGroupBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group

          render json: { data: SchoolGroupBlueprint.render_as_hash(group) }
        end

        def create
          authorize SchoolGroup

          result = ::Platform::CreateSchoolGroupService.call(params: school_group_params)
          render_service_result(result, success_status: :created) do |group|
            render json: { data: SchoolGroupBlueprint.render_as_hash(group) }, status: :created
          end
        end

        def update
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group

          result = ::Platform::UpdateSchoolGroupService.call(group: group, params: school_group_params)
          render_service_result(result) do |updated_group|
            render json: { data: SchoolGroupBlueprint.render_as_hash(updated_group) }
          end
        end

        def destroy
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group

          result = ::Platform::DiscardSchoolGroupService.call(group: group)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        def schools
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group, :schools?

          result = ::Platform::ListSchoolGroupSchoolsService.call(group: group)
          render_service_result(result) do |schools|
            render json: { data: SchoolBlueprint.render_as_hash(schools, view: :summary) }
          end
        end

        def assign_school
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group, :assign_school?

          result = ::Platform::AssignSchoolToGroupService.call(
            group: group,
            school_id: params.require(:school_id)
          )
          render_service_result(result) do |school|
            render json: { data: SchoolBlueprint.render_as_hash(school, view: :summary) }
          end
        end

        def unassign_school
          group = policy_scope(SchoolGroup.kept).find(params[:id])
          authorize group, :unassign_school?

          result = ::Platform::UnassignSchoolFromGroupService.call(
            group: group,
            school_id: params[:school_id]
          )
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        private

        def school_group_params
          params.require(:school_group).permit(:name, :headquarters_cnpj)
        end

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
