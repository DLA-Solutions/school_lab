# frozen_string_literal: true

module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, if: :public_auth_action?
      skip_before_action :ensure_user_active!, if: :public_auth_action?

      def invite_accept
        result = Auth::AcceptInviteService.call(
          token: invite_accept_params[:token],
          password: invite_accept_params[:password],
          password_confirmation: invite_accept_params[:password_confirmation],
          name: invite_accept_params[:name]
        )

        render_service_result(result, success_status: :ok) do |data|
          render json: { data: data }, status: :ok
        end
      end

      # The token from the e-mail is exchanged for a new password.
      def reset_password
        result = Auth::ResetPasswordService.call(
          token: reset_password_params[:token],
          password: reset_password_params[:password],
          password_confirmation: reset_password_params[:password_confirmation]
        )

        render_service_result(result, success_status: :no_content) do
          head :no_content
        end
      end

      # Deliberately answers the same whether or not the CPF is registered — see the service.
      def request_access
        Auth::RequestGuardianAccessService.call(cpf: params[:cpf])
        head :no_content
      end

      def login
        result = Auth::LoginService.call(
          email: login_params[:email],
          password: login_params[:password],
          remember_me: login_params[:remember_me],
          client: login_params[:client]
        )

        render_auth_tokens(result)
      end

      def google_login
        result = Auth::GoogleLoginService.call(
          id_token: google_login_params[:id_token],
          remember_me: google_login_params[:remember_me],
          client: google_login_params[:client]
        )

        render_auth_tokens(result)
      end

      def refresh
        result = Auth::RefreshTokensService.call(
          refresh_token: refresh_token_from_request,
          remember_me: refresh_params[:remember_me]
        )

        render_service_result(result, success_status: :ok) do |data|
          set_refresh_cookie(data[:refresh_token], Time.zone.parse(data[:refresh_expires_at])) if web_client_from_params?

          render json: AuthTokensBlueprint.render_as_hash(
            data.except(:user, :refresh_token).merge(
              refresh_token: mobile_refresh_response? ? data[:refresh_token] : nil
            )
          ), status: :ok
        end
      end

      def logout
        Auth::RevokeTokensService.call(user: Current.user, refresh_token: refresh_token_from_request)
        clear_refresh_cookie
        head :no_content
      end

      def password
        if request.post?
          Auth::RequestPasswordResetService.call(email: password_params[:email])
          head :no_content
        else
          result = Auth::ChangePasswordService.call(
            user: Current.user,
            current_password: password_params[:current_password],
            password: password_params[:password],
            password_confirmation: password_params[:password_confirmation]
          )

          render_service_result(result, success_status: :no_content) do
            head :no_content
          end
        end
      end

      private

      def public_auth_action?
        action_name.in?(%w[login google_login refresh invite_accept reset_password request_access]) ||
          (action_name == "password" && request.post?)
      end

      def reset_password_params
        params.permit(:token, :password, :password_confirmation)
      end

      def invite_accept_params
        params.permit(:token, :password, :password_confirmation, :name)
      end


      def login_params
        params.permit(:email, :password, :remember_me, :client)
      end

      def google_login_params
        params.permit(:id_token, :remember_me, :client)
      end

      def refresh_params
        params.permit(:refresh_token, :remember_me, :client)
      end

      def password_params
        params.permit(:email, :current_password, :password, :password_confirmation)
      end

      def web_client?
        auth_client_param == "web"
      end

      def web_client_from_params?
        refresh_params[:client].to_s == "web" || cookies.encrypted[refresh_cookie_name].present?
      end

      def mobile_client?
        auth_client_param != "web"
      end

      def auth_client_param
        if action_name == "google_login"
          google_login_params[:client].to_s
        else
          login_params[:client].to_s
        end
      end

      def render_auth_tokens(result)
        render_service_result(result, success_status: :ok) do |data|
          set_refresh_cookie(data[:refresh_token], Time.zone.parse(data[:refresh_expires_at])) if web_client?

          render json: AuthTokensBlueprint.render_as_hash(
            data.except(:refresh_token).merge(refresh_token: mobile_client? ? data[:refresh_token] : nil)
          ), status: :ok
        end
      end

      def mobile_refresh_response?
        refresh_params[:refresh_token].present?
      end
    end
  end
end
