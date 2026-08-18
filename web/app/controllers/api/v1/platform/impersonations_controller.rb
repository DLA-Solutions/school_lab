# frozen_string_literal: true

module Api
  module V1
    module Platform
      class ImpersonationsController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def create
          authorize :platform_impersonation, :create?, policy_class: PlatformImpersonationPolicy

          result = ::Platform::StartImpersonationService.call(
            operator: Current.user,
            school_id: impersonation_params[:school_id],
            target_membership_id: impersonation_params[:target_membership_id]
          )
          render_service_result(result, success_status: :created) do |payload|
            render json: {
              data: PlatformImpersonationSessionBlueprint.render_as_hash(payload[:session]).merge(
                access_token: payload[:access_token],
                access_expires_at: payload[:access_expires_at]
              )
            }, status: :created
          end
        end

        def destroy
          authorize :platform_impersonation, :destroy?, policy_class: PlatformImpersonationPolicy

          session = PlatformImpersonationSession.find_by(id: params[:id])
          return render_not_found if session.blank?

          result = ::Platform::EndImpersonationService.call(session: session, operator: Current.user)
          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        private

        def impersonation_params
          params.require(:impersonation).permit(:school_id, :target_membership_id)
        end

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
