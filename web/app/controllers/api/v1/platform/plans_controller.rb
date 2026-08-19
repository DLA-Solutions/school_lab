# frozen_string_literal: true

module Api
  module V1
    module Platform
      class PlansController < Api::V1::BaseController
        rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

        def index
          authorize :platform_plan, :index?, policy_class: PlatformPlanPolicy

          plans = PlatformPlan.kept.includes(:platform_plan_provider_prices).order(:monthly_amount_cents)
          render json: { data: PlatformPlanBlueprint.render_as_hash(plans) }
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
