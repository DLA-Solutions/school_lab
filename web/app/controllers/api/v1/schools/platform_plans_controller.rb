# frozen_string_literal: true

module Api
  module V1
    module Schools
      class PlatformPlansController < BaseController
        def index
          authorize :platform_plan, :index_own?, policy_class: PlatformPlanPolicy

          result = ::Platform::ListSchoolPlatformPlansService.call(scope: policy_scope(PlatformPlan))
          render json: { data: PlatformPlanBlueprint.render_as_hash(result.data, view: :school) }
        end
      end
    end
  end
end
