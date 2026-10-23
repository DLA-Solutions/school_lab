# frozen_string_literal: true

module Api
  module V1
    module Schools
      class DocumentsController < BaseController
        def index
          authorize Document

          return render_conflicting_filters if guardian_filter? && documentable_filter?

          authorize Document, :list_inactive? if inactive_filter?

          documents = listed_documents.includes(file_attachment: :blob).order(created_at: :desc)
          documents = guardian_filter? ? filter_by_guardian(documents) : filter_by_documentable(documents)
          pagy, records = pagy(documents)

          render json: {
            data: render_documents(records, view: (:family if guardian_filter?)),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          document = policy_scope(Document).includes(file_attachment: :blob).find(params[:id])
          authorize document

          render json: { data: render_document(document) }
        end

        def create
          authorize Document

          result = ::Documents::CreateDocumentService.call(
            school: Current.school,
            actor: Current.user,
            params: document_params.except(:file),
            file: document_file_param
          )
          render_service_result(result, success_status: :created) do |document|
            render json: { data: render_document(document) }, status: :created
          end
        end

        def update
          document = policy_scope(Document).find(params[:id])
          authorize document

          result = ::Documents::UpdateDocumentService.call(
            document: document,
            params: document_params.except(:file, :documentable_type, :documentable_id),
            file: document_file_param
          )
          render_service_result(result) do |updated|
            render json: { data: render_document(updated) }
          end
        end

        def destroy
          authorize Document, :manage?
          document = policy_scope(Document).find(params[:id])
          authorize document

          result = ::Documents::DiscardDocumentService.call(document: document, actor: Current.user)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        def approve
          document = policy_scope(Document).find(params[:id])
          authorize document, :approve?

          result = ::Documents::ApproveDocumentService.call(document: document)
          render_service_result(result) do |updated|
            render json: { data: render_document(updated) }
          end
        end

        def reject
          document = policy_scope(Document).find(params[:id])
          authorize document, :reject?

          result = ::Documents::RejectDocumentService.call(
            document: document,
            rejection_reason: reject_params[:rejection_reason]
          )
          render_service_result(result) do |updated|
            render json: { data: render_document(updated) }
          end
        end

        private

        # Default listings hide inactivated documents. `inactive=true` (staff with
        # `manage_documents` only) lists just the inactivated ones, for the student's history.
        def listed_documents
          return policy_scope(Document) unless inactive_filter?

          DocumentPolicy::Scope.new(pundit_user, Document).resolve_inactive.includes(:discarded_by)
        end

        def inactive_filter?
          ActiveModel::Type::Boolean.new.cast(params[:inactive]) == true
        end

        def guardian_filter?
          params[:guardian_id].present?
        end

        def documentable_filter?
          params[:documentable_type].present? || params[:documentable_id].present?
        end

        # `guardian_id` is its own question ("everything about this guardian"), so mixing it with
        # the owner filter would be ambiguous — refuse rather than silently pick one.
        def render_conflicting_filters
          render_error(
            :validation_error,
            status: :unprocessable_entity,
            details: { guardian_id: [ I18n.t("api.errors.documents_filter_conflict") ] }
          )
        end

        # The guardian's own files plus those of children linked to them. A guardian id from
        # another school, or unknown, matches nothing. `.family` rows read the child and the
        # sender, so both are preloaded here.
        def filter_by_guardian(scope)
          scope.about_guardian(params[:guardian_id], Current.school.id)
               .includes(:documentable, uploaded_by: :guardians)
        end

        # Narrows the list to one owner, so a screen can show the documents of a single guardian
        # or student without paging through the whole school. Both parameters are required
        # together — a type without an id would silently widen the result.
        def filter_by_documentable(scope)
          type = params[:documentable_type]
          id = params[:documentable_id]
          return scope if type.blank? || id.blank?
          return scope.none unless Document::DOCUMENTABLE_TYPES.include?(type)

          scope.where(documentable_type: type, documentable_id: id)
        end

        def document_params
          params.require(:document).permit(:documentable_type, :documentable_id, :document_type, :file)
        end

        def document_file_param
          params.dig(:document, :file)
        end

        def reject_params
          params.permit(:rejection_reason)
        end

        def render_documents(records, view: nil)
          DocumentBlueprint.render_as_hash(records, blueprint_options.merge({ view: view }.compact))
        end

        def render_document(document)
          DocumentBlueprint.render_as_hash(document, blueprint_options)
        end

        def blueprint_options
          { url_helpers: Rails.application.routes.url_helpers, full_url: false }
        end
      end
    end
  end
end
