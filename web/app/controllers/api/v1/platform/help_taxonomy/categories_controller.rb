# frozen_string_literal: true

module Api
  module V1
    module Platform
      module HelpTaxonomy
        class CategoriesController < Api::V1::BaseController
          rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

          def index
            authorize HelpTaxonomyCategory

            result = ::Platform::ListHelpTaxonomyCategoriesService.call
            return render_service_result(result) unless result.success?

            pagy, records = pagy(result.data)
            render json: {
              data: HelpTaxonomyCategoryBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            category = policy_scope(HelpTaxonomyCategory.kept).find(params[:id])
            authorize category

            render json: { data: HelpTaxonomyCategoryBlueprint.render_as_hash(category) }
          end

          def create
            authorize HelpTaxonomyCategory

            result = ::Platform::CreateHelpTaxonomyCategoryService.call(params: category_params)
            render_service_result(result, success_status: :created) do |category|
              render json: { data: HelpTaxonomyCategoryBlueprint.render_as_hash(category) }, status: :created
            end
          end

          def update
            category = policy_scope(HelpTaxonomyCategory.kept).find(params[:id])
            authorize category

            result = ::Platform::UpdateHelpTaxonomyCategoryService.call(
              category: category,
              params: category_params
            )
            render_service_result(result) do |updated_category|
              render json: { data: HelpTaxonomyCategoryBlueprint.render_as_hash(updated_category) }
            end
          end

          def destroy
            category = policy_scope(HelpTaxonomyCategory.kept).find(params[:id])
            authorize category

            result = ::Platform::DiscardHelpTaxonomyCategoryService.call(category: category)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          private

          def category_params
            params.require(:category).permit(:name, :slug, :module_key, :position, persona_tags: [])
          end

          def render_platform_forbidden
            code = Current.user&.backoffice? ? :forbidden : :backoffice_only
            render_error(code, status: :forbidden)
          end
        end
      end
    end
  end
end
