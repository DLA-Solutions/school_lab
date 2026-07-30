# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def disable
        user = User.kept.find(params[:id])
        authorize user, :disable?

        result = ::Users::DisableUserService.call(user: user, actor: Current.user)
        render_service_result(result, success_status: :no_content) do
          head :no_content
        end
      end

      def enable
        user = User.kept.find(params[:id])
        authorize user, :enable?

        result = ::Users::EnableUserService.call(user: user)
        render_service_result(result, success_status: :no_content) do
          head :no_content
        end
      end
    end
  end
end
