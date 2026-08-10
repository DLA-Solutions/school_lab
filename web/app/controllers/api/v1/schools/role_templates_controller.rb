# frozen_string_literal: true

module Api
  module V1
    module Schools
      class RoleTemplatesController < BaseController
        def index
          authorize SchoolRoleTemplate

          templates = policy_scope(SchoolRoleTemplate)
                       .includes(:role_template_permissions)
                       .order(:name)
          pagy, records = pagy(templates)

          render json: {
            data: render_templates(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def create
          authorize SchoolRoleTemplate

          result = Identity::CreateRoleTemplateService.call(
            school: Current.school,
            params: role_template_params
          )
          render_service_result(result, success_status: :created) do |template|
            render json: { data: render_template(template) }, status: :created
          end
        end

        def update
          template = policy_scope(SchoolRoleTemplate).find(params[:id])
          authorize template

          result = Identity::UpdateRoleTemplateService.call(
            template: template,
            params: role_template_params
          )
          render_service_result(result) do |data|
            render json: {
              data: render_template(
                data[:template],
                affected_memberships_count: data[:affected_memberships_count]
              )
            }
          end
        end

        def destroy
          template = policy_scope(SchoolRoleTemplate).find(params[:id])
          authorize template

          result = Identity::DestroyRoleTemplateService.call(template: template)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        def clone
          template = policy_scope(SchoolRoleTemplate).find(params[:id])
          authorize template, :clone?

          result = Identity::CloneRoleTemplateService.call(
            source_template: template,
            name: clone_params[:name]
          )
          render_service_result(result, success_status: :created) do |cloned|
            render json: { data: render_template(cloned) }, status: :created
          end
        end

        private

        def role_template_params
          params.permit(:name, permissions: %i[permission_key scope_kind])
        end

        def clone_params
          params.permit(:name)
        end

        def render_templates(records)
          SchoolRoleTemplateBlueprint.render_as_hash(records, view: :detail)
        end

        def render_template(template, affected_memberships_count: nil)
          options = { view: :detail }
          options[:affected_memberships_count] = affected_memberships_count unless affected_memberships_count.nil?
          SchoolRoleTemplateBlueprint.render_as_hash(template, options)
        end
      end
    end
  end
end
