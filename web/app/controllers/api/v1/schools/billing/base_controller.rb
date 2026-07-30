# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class BaseController < Api::V1::BaseController
          before_action :set_school_context!
        end
      end
    end
  end
end
