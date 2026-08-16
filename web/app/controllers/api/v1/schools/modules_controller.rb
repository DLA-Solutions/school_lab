# frozen_string_literal: true

module Api
  module V1
    module Schools
      class ModulesController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_modules_forbidden

        def update
          school = policy_scope(School.kept).find(params[:id])
          authorize school, :update?, policy_class: SchoolModulePolicy

          result = nil
          SchoolLab::BackofficeAuditMetadata.with_comment(school: school) do
            result = ::Schools::UpdateSchoolModulesService.call(
              school: school,
              modules: modules_params
            )
          end

          render_service_result(result) do |module_map|
            render json: { data: SchoolModulesBlueprint.render_as_hash(module_map) }
          end
        end

        private

        def modules_params
          params.require(:modules).to_unsafe_h
        end

        def render_modules_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
