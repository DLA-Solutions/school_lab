# frozen_string_literal: true

module Api
  module V1
    module Schools
      # "Compliance" (BC5): the school's own regulatory files. Same `documents` table and the same
      # DocumentPolicy as the archive, but a separate surface: the owner is always the school and
      # the type comes from a closed catalog, so none of the archive's free-form inputs apply.
      class ComplianceDocumentsController < BaseController
        include ModuleEnabledGuard

        require_enabled_module "documents"

        def index
          authorize Document, :manage_compliance?

          documents = compliance_scope.includes(file_attachment: :blob).order(created_at: :desc, id: :desc)
          documents = documents.where(document_type: params[:document_type]) if params[:document_type].present?
          pagy, records = pagy(documents)

          render json: {
            data: ComplianceDocumentBlueprint.render_as_hash(records, blueprint_options),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count,
                    types: ComplianceDocumentBlueprint.catalog }
          }
        end

        def show
          authorize Document, :manage_compliance?

          document = compliance_scope.includes(file_attachment: :blob).find(params[:id])
          authorize document, :manage_compliance?

          render json: { data: ComplianceDocumentBlueprint.render_as_hash(document, blueprint_options) }
        end

        def create
          authorize Document, :manage_compliance?

          result = ::Documents::Compliance::CreateService.call(
            school: Current.school,
            actor: Current.user,
            params: create_params,
            file: params[:file]
          )
          render_service_result(result, success_status: :created) do |document|
            render json: { data: ComplianceDocumentBlueprint.render_as_hash(document, blueprint_options) },
                   status: :created
          end
        end

        def destroy
          authorize Document, :manage_compliance?

          document = compliance_scope.find(params[:id])
          authorize document, :manage_compliance?

          result = ::Documents::DiscardDocumentService.call(document: document, actor: Current.user)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        private

        # Show and destroy authorize the class first: a guardian's policy scope is empty, and the
        # 404 from `find` would otherwise hide the 403 they are owed.
        #
        # Kept rows of this school only; policy_scope binds the school, `compliance` the owner and
        # the catalog, so a student's file or a discarded one is a plain 404.
        def compliance_scope
          policy_scope(Document).compliance
        end

        def create_params
          params.permit(:document_type)
        end

        def blueprint_options
          { url_helpers: Rails.application.routes.url_helpers, full_url: false }
        end
      end
    end
  end
end
