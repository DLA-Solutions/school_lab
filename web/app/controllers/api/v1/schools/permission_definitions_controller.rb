# frozen_string_literal: true

module Api
  module V1
    module Schools
      class PermissionDefinitionsController < BaseController
        def index
          authorize SchoolRoleTemplate, :index?

          result = Identity::ListPermissionDefinitionsService.call
          render_service_result(result) do |data|
            render json: { data: data }
          end
        end
      end
    end
  end
end
