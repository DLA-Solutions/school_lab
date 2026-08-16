# frozen_string_literal: true

module Api
  module V1
    class BaseController < ActionController::API
      include ActionController::Cookies
      include AuditContext
      include ProvisioningAuditContext
      include Pagy::Method
      include Pundit::Authorization

      around_action :with_requested_locale
      before_action :authenticate_user!
      before_action :ensure_user_active!

      rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

      private

      # The SPA sends `Accept-Language` on every call, so an error printed under a field reads in
      # the same language as the field's own label. Anything the API does not speak falls to the
      # default rather than being answered in a language nobody asked for.
      #
      # `around_action` rather than `before_action`: `I18n.locale` is per-thread, and a server
      # that reuses threads would otherwise leak one request's language into the next.
      def with_requested_locale(&)
        I18n.with_locale(requested_locale, &)
      end

      def requested_locale
        header = request.headers["Accept-Language"].to_s

        # Quality values and multiple entries are more than the SPA sends, but a browser will send
        # them; the first tag we actually speak wins.
        tags = header.split(",").map { |part| part.split(";").first.to_s.strip }.compact_blank

        tags.find { |tag| I18n.available_locales.include?(tag.to_sym) } ||
          tags.filter_map { |tag| primary_match(tag) }.first ||
          I18n.default_locale
      end

      # "pt", "pt-PT" and "pt-br" all mean pt-BR here: we carry one variant of each language, and
      # answering a Portuguese speaker in English over a region subtag would be absurd.
      def primary_match(tag)
        primary = tag.split("-").first.to_s.downcase
        return if primary.blank?

        I18n.available_locales.find { |locale| locale.to_s.split("-").first.downcase == primary }
      end

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

        if membership
          if membership.suspended?
            return render_error(:membership_suspended, status: :forbidden)
          end

          if membership.invited?
            return render_error(:membership_invited, status: :forbidden)
          end

          Current.school = school
          Current.membership = membership
          return
        end

        if Current.user.backoffice?
          if Current.user.platform_permission?(:provision_school)
            Current.school = school
            return
          end

          return render_error(:forbidden, status: :forbidden) if school.provisioning?
        end

        render_error(:not_found, status: :not_found)
      end

      def set_handoff_context!(school)
        membership = Current.user.memberships.kept.find_by(school: school)
        if membership
          Current.school = school
          Current.membership = membership
        elsif Current.user.backoffice? && Current.user.platform_permission?(:provision_school)
          Current.school = school
        end
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
        when :unauthorized, :invalid_credentials, :invalid_invite_token
          :unauthorized
        when :forbidden, :module_disabled
          :forbidden
        when :not_found
          :not_found
        when :not_implemented
          :not_implemented
        when :invalid_state_transition, :year_in_use, :active_year_exists, :invalid_closure_transition,
             :period_closed, :grade_launch_exists, :report_card_frozen, :publication_in_progress,
             :generation_in_progress
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
          path: "/",
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
