# frozen_string_literal: true

module Api
  module V1
    module Platform
      class OperatorsController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def index
          authorize :platform_operator, :index?, policy_class: PlatformOperatorPolicy

          operators = User.kept
                          .joins(:memberships)
                          .merge(Membership.kept.where(role: "backoffice", school_id: nil))
                          .distinct
                          .order(:email)

          pagy, records = pagy(operators)
          render json: {
            data: PlatformOperatorBlueprint.render_as_hash(records),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        private

        def render_platform_forbidden
          code = Current.user&.backoffice? ? :forbidden : :backoffice_only
          render_error(code, status: :forbidden)
        end
      end
    end
  end
end
