# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def index
        authorize User

        users = filter_users(policy_scope(User.kept).order(:email))
        pagy, records = pagy(users)

        render json: {
          data: UserBlueprint.render_as_hash(records, view: :list),
          meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
        }
      end

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

      private

      def filter_users(scope)
        term = params[:q].to_s.strip
        status = params[:status].to_s.presence

        scope = scope.where("users.email ILIKE ?", "%#{User.sanitize_sql_like(term)}%") if term.present?
        scope = scope.where(status: status) if status.in?(User::STATUSES)

        scope
      end
    end
  end
end
