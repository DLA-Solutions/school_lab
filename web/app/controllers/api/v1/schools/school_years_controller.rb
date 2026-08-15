# frozen_string_literal: true

module Api
  module V1
    module Schools
      class SchoolYearsController < BaseController
        before_action :set_school_context!

        def index
          authorize :school_year, :index?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def show
          authorize :school_year, :show?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def create
          authorize :school_year, :create?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def update
          authorize :school_year, :update?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def destroy
          authorize :school_year, :destroy?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def active
          authorize :school_year, :active?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def activate
          authorize :school_year, :activate?, policy_class: SchoolYearPolicy
          render_not_implemented
        end

        def archive
          authorize :school_year, :archive?, policy_class: SchoolYearPolicy
          render_not_implemented
        end
      end
    end
  end
end
