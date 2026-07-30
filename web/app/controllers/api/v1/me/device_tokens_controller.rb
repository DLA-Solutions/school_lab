# frozen_string_literal: true

module Api
  module V1
    module Me
      class DeviceTokensController < BaseController
        def create
          authorize DeviceToken

          result = Auth::RegisterDeviceTokenService.call(
            user: Current.user,
            token: device_token_params[:token],
            platform: device_token_params[:platform]
          )

          render_service_result(result, success_status: :created) do |device_token|
            render json: { data: DeviceTokenBlueprint.render_as_hash(device_token) }, status: :created
          end
        end

        private

        def device_token_params
          params.require(:device_token).permit(:token, :platform)
        end
      end
    end
  end
end
