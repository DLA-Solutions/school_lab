# frozen_string_literal: true

module Api
  module V1
    module Platform
      class AuditsController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def index
          authorize :platform_audit, :index?, policy_class: PlatformAuditPolicy

          result = ::Platform::ListAuditsService.call(filters: audit_filters)
          return render_service_result(result) unless result.success?

          pagy, records = pagy(result.data)
          render json: {
            data: AuditBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        private

        def audit_filters
          {
            school_id: params[:school_id],
            action: params[:action].to_s.presence,
            date_from: params[:date_from],
            date_to: params[:date_to]
          }
        end

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
