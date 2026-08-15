# frozen_string_literal: true

module Api
  module V1
    module Schools
      class HolidaysController < BaseController
        before_action :set_school_context!

        def index
          authorize :holiday, :index?, policy_class: HolidayPolicy
          render_not_implemented
        end

        def create
          authorize :holiday, :create?, policy_class: HolidayPolicy
          render_not_implemented
        end

        def update
          authorize :holiday, :update?, policy_class: HolidayPolicy
          render_not_implemented
        end

        def destroy
          authorize :holiday, :destroy?, policy_class: HolidayPolicy
          render_not_implemented
        end
      end
    end
  end
end
