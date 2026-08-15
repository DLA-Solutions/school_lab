# frozen_string_literal: true

module Api
  module V1
    module Schools
      class AcademicPeriodsController < BaseController
        before_action :set_school_context!

        def index
          authorize :academic_period, :index?, policy_class: AcademicPeriodPolicy
          render_not_implemented
        end

        def create
          authorize :academic_period, :create?, policy_class: AcademicPeriodPolicy
          render_not_implemented
        end

        def update
          authorize :academic_period, :update?, policy_class: AcademicPeriodPolicy
          render_not_implemented
        end
      end
    end
  end
end
