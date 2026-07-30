# frozen_string_literal: true

module Api
  module V1
    class BaseController < ActionController::API
      include ActionController::Cookies
      include AuditContext
      include Pagy::Method
      include Pundit::Authorization

      before_action :authenticate_user!
      before_action :ensure_user_active!

      rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

      private

      def authenticate_user!
        return if skip_authentication?

        token = bearer_token
        return render_error(:unauthorized, status: :unauthorized) if token.blank?

        result = Auth::DecodeAccessTokenService.call(token: token)
        return render_error(result.error_code, status: :unauthorized) if result.failure?

        Current.user = result.data
      end

      def ensure_user_active!
        return unless Current.user

        if Current.user.discarded?
          Current.user = nil
          return render_error(:unauthorized, status: :unauthorized)
        end

        if Current.user.disabled?
          Auth::RevokeTokensService.call(user: Current.user)
          Current.user = nil
          return render_error(:unauthorized, status: :unauthorized)
        end

        return unless Current.user.locked_at?

        Current.user = nil
        render_error(:unauthorized, status: :unauthorized)
      end

      def set_school_context!
        school = School.kept.find(params[:school_id])
        membership = Current.user.memberships.kept.find_by(school: school)
        return render_error(:not_found, status: :not_found) unless membership

        if membership.suspended?
          return render_error(:membership_suspended, status: :forbidden)
        end

        if membership.invited?
          return render_error(:membership_invited, status: :forbidden)
        end

        Current.school = school
        Current.membership = membership
      end

      def pundit_user
        Current.user
      end

      def bearer_token
        header = request.headers["Authorization"]
        return if header.blank?

        header.split.last if header.start_with?("Bearer ")
      end

      def skip_authentication?
        false
      end

      def render_error(code, status:, details: nil)
        render json: {
          error: {
            code: code.to_s,
            message: I18n.t("api.errors.#{code}", default: code.to_s.humanize),
            details: details || {}
          }
        }, status: status
      end

      def render_forbidden
        render_error(:forbidden, status: :forbidden)
      end

      def render_not_found
        render_error(:not_found, status: :not_found)
      end

      def render_not_implemented
        render_error(:not_implemented, status: :not_implemented)
      end

      def render_service_result(result, success_status: :ok)
        if result.success?
          yield result.data if block_given?
        else
          status = error_status_for(result.error_code)
          render_error(result.error_code, status: status, details: result.details)
        end
      end

      def error_status_for(code)
        case code.to_sym
        when :unauthorized, :invalid_credentials
          :unauthorized
        when :forbidden
          :forbidden
        when :not_found
          :not_found
        when :not_implemented
          :not_implemented
        when :invalid_state_transition
          :conflict
        else
          :unprocessable_content
        end
      end

      def refresh_cookie_name
        "refresh_token"
      end

      def set_refresh_cookie(token, expires_at)
        cookies.encrypted[refresh_cookie_name] = {
          value: token,
          httponly: true,
          secure: Rails.env.production?,
          same_site: :lax,
          expires: expires_at
        }
      end

      def clear_refresh_cookie
        cookies.delete(refresh_cookie_name)
      end

      def refresh_token_from_request
        params[:refresh_token].presence || cookies.encrypted[refresh_cookie_name]
      end
    end
  end
end
