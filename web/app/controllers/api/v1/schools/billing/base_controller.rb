# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class BaseController < Api::V1::BaseController
          include ModuleEnabledGuard

          before_action :set_school_context!
          require_enabled_module "billing"
        end
      end
    end
  end
end
