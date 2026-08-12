# frozen_string_literal: true

module Api
  module V1
    module Schools
      # The school's front page: head count, ticket, what the month brought in.
      class DashboardController < BaseController
        BILLING_KEYS = %i[students collaborators average_ticket monthly_revenue didactic_material
                          monthly_income_series].freeze
        PEOPLE_KEYS = %i[students_by_class].freeze

        before_action :set_school_context!

        def show
          authorize :dashboard, :show?

          result = ::Dashboards::SchoolMetricsService.call(school: Current.school, month: params[:month])

          render json: { data: filter_dashboard_data(result.data) }
        end

        private

        def filter_dashboard_data(data)
          data.slice(*allowed_dashboard_keys)
        end

        def allowed_dashboard_keys
          keys = [ :month ]
          keys.concat(BILLING_KEYS) if dashboard_policy.billing_metrics?
          keys << :students if dashboard_policy.people_metrics?
          keys.concat(PEOPLE_KEYS) if dashboard_policy.people_metrics?
          keys.uniq
        end

        def dashboard_policy
          policy(:dashboard)
        end
      end
    end
  end
end
