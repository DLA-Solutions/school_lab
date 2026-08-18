# frozen_string_literal: true

module Api
  module V1
    module Platform
      module Analytics
        class OverviewController < Api::V1::BaseController
          rescue_from Pundit::NotAuthorizedError, with: :render_platform_forbidden

          def show
            authorize :platform_analytics_overview, :show?, policy_class: PlatformAnalyticsOverviewPolicy

            result = ::Platform::AnalyticsOverviewService.call(
              date_from: params[:date_from],
              date_to: params[:date_to]
            )
            render_service_result(result) do |data|
              render json: { data: data }
            end
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
end
