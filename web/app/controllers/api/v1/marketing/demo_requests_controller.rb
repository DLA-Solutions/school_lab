# frozen_string_literal: true

module Api
  module V1
    module Marketing
      class DemoRequestsController < BaseController
        skip_before_action :authenticate_user!
        skip_before_action :ensure_user_active!

        def create
          result = ::Marketing::SubmitDemoRequestService.call(
            params: demo_request_params.to_h.symbolize_keys,
            client_ip: request.remote_ip
          )

          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end

        private

        def demo_request_params
          params.permit(:name, :email, :phone, :website, :_hp)
        end
      end
    end
  end
end
