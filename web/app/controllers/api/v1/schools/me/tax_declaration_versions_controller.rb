# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class TaxDeclarationVersionsController < BaseController
          include TaxDeclarationPdfDelivery

          def index
            declaration = find_declaration
            authorize declaration, :show?

            versions = policy_scope(TaxDeclarationVersion)
                       .where(tax_declaration_id: declaration.id)
                       .order(version: :desc)
            pagy, records = pagy(versions)

            render json: {
              data: records.map { |version| version_payload(version) },
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            version = find_version
            authorize version

            render json: { data: version_payload(version) }
          end

          def pdf
            version = find_version
            authorize version, :pdf?

            send_version_pdf(version)
          end

          private

          def find_declaration
            policy_scope(TaxDeclaration).find(params[:tax_declaration_id])
          end

          def find_version
            declaration = find_declaration
            policy_scope(TaxDeclarationVersion).find_by!(
              id: params[:id],
              tax_declaration_id: declaration.id
            )
          end

          def version_payload(version)
            TaxDeclarationVersionBlueprint.render_as_hash(version, school_id: Current.school.id)
          end
        end
      end
    end
  end
end
