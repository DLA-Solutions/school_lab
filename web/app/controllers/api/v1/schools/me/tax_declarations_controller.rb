# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class TaxDeclarationsController < BaseController
          def index
            authorize TaxDeclaration

            declarations = policy_scope(TaxDeclaration)
                           .includes(:active_version)
                           .order(calendar_year: :desc)
            pagy, records = pagy(declarations)

            render json: {
              data: records.map { |declaration| list_payload(declaration) },
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            declaration = find_declaration
            authorize declaration

            render json: {
              data: aggregate_payload(declaration)
            }
          end

          def create
            authorize TaxDeclaration

            result = ::Billing::TaxDeclarations::EnsureGeneratedService.call(
              school: Current.school,
              guardian: Current.guardian,
              calendar_year: tax_declaration_params.fetch(:calendar_year)
            )

            render_service_result(result, success_status: result.success? && result.data.created ? :created : :ok) do |payload|
              status = result.data.created ? :created : :ok
              render json: { data: ensure_payload(payload) }, status: status
            end
          end

          private

          def tax_declaration_params
            params.require(:tax_declaration).permit(:calendar_year)
          end

          def find_declaration
            policy_scope(TaxDeclaration).includes(:active_version).find(params[:id])
          end

          def list_payload(declaration)
            version = declaration.active_version
            {
              tax_declaration_id: declaration.id,
              calendar_year: declaration.calendar_year,
              active_version_id: declaration.active_version_id,
              version: version && version_summary(version)
            }
          end

          def aggregate_payload(declaration)
            list_payload(declaration)
          end

          def ensure_payload(result)
            declaration = result.declaration
            version = result.version
            {
              tax_declaration_id: declaration.id,
              calendar_year: declaration.calendar_year,
              active_version_id: declaration.active_version_id,
              version: version_summary(version)
            }
          end

          def version_summary(version)
            TaxDeclarationVersionBlueprint.render_as_hash(version, school_id: Current.school.id)
          end
        end
      end
    end
  end
end
