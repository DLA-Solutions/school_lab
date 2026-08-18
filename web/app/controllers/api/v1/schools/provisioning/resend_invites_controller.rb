# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Provisioning
        class ResendInvitesController < Schools::BaseController
          rescue_from Pundit::NotAuthorizedError, with: :render_resend_forbidden

          def create
            authorize Current.school, :create?, policy_class: ProvisioningResendInvitesPolicy

            result = ::Schools::ResendProvisioningInvitesService.call(
              school: Current.school,
              actor: Current.user
            )
            render_service_result(result) do |payload|
              render json: { data: payload }
            end
          end

          private

          def render_resend_forbidden
            code = Current.user&.backoffice? ? :forbidden : :backoffice_only
            render_error(code, status: :forbidden)
          end
        end
      end
    end
  end
end
