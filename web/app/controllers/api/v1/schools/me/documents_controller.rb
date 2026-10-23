# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # "Meus documentos": the documents of every child the guardian is linked to. Documents
        # belong to the child, so co-guardians see — and add to — the same list.
        class DocumentsController < BaseController
          def index
            authorize Document

            documents = policy_scope(Document)
                        .includes(:documentable, file_attachment: :blob, uploaded_by: :guardians)
                        .order(created_at: :desc)
            documents = filter_by_student(documents)
            documents = filter_by_document_type(documents)
            pagy, records = pagy(documents)

            render json: {
              data: DocumentBlueprint.render_as_hash(records, blueprint_options),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize Document, :create_family_document?

            result = ::Documents::CreateGuardianDocumentService.call(
              school: Current.school,
              guardian: Current.guardian,
              actor: Current.user,
              params: create_params,
              file: params[:file]
            )
            render_service_result(result, success_status: :created) do |document|
              document = Document.includes(:documentable, file_attachment: :blob, uploaded_by: :guardians)
                                 .find(document.id)
              render json: { data: DocumentBlueprint.render_as_hash(document, blueprint_options) },
                     status: :created
            end
          end

          private

          # A child outside the guardian's family answers 404, same as an unknown id.
          def filter_by_student(scope)
            return scope if params[:student_id].blank?

            student = Current.guardian.students.kept.where(school_id: Current.school.id).find(params[:student_id])
            scope.where(documentable_type: "Student", documentable_id: student.id)
          end

          # An unknown type simply matches nothing; the filter narrows what policy_scope allows.
          def filter_by_document_type(scope)
            return scope if params[:document_type].blank?

            scope.where(document_type: params[:document_type].to_s)
          end

          def create_params
            params.permit(:student_id, :document_type)
          end

          def blueprint_options
            { view: :family, url_helpers: Rails.application.routes.url_helpers, full_url: false }
          end
        end
      end
    end
  end
end
