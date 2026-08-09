# frozen_string_literal: true

module Api
  module V1
    class SchoolsController < BaseController
      def index
        authorize School

        schools = policy_scope(School.kept).order(:name)
        pagy, records = pagy(schools)

        render json: {
          data: SchoolBlueprint.render_as_hash(records),
          meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
        }
      end

      def show
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        render json: { data: SchoolBlueprint.render_as_hash(school) }
      end

      def create
        authorize School

        result = ::Schools::CreateSchoolService.call(params: school_params, actor: Current.user)
        render_service_result(result, success_status: :created) do |school|
          render json: { data: SchoolBlueprint.render_as_hash(school) }, status: :created
        end
      end

      def update
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        result = ::Schools::UpdateSchoolService.call(school: school, params: school_params)
        render_service_result(result) do |updated_school|
          render json: { data: SchoolBlueprint.render_as_hash(updated_school) }
        end
      end

      def destroy
        school = policy_scope(School.kept).find(params[:id])
        authorize school

        result = ::Schools::DiscardSchoolService.call(school: school, actor: Current.user)
        render_service_result(result, success_status: :no_content) do
          head :no_content
        end
      end

      private

      def school_params
        params.require(:school).permit(:name, :cnpj, :address, :saas_plan, :school_group_id)
      end
    end
  end
end
