# frozen_string_literal: true

module Api
  module V1
    module Schools
      # The school's front page: head count, ticket, what the month brought in.
      class DashboardController < BaseController
        before_action :set_school_context!

        def show
          authorize :dashboard, :show?

          result = ::Dashboards::SchoolMetricsService.call(school: Current.school, month: params[:month])

          render json: { data: result.data }
        end
      end
    end
  end
end
