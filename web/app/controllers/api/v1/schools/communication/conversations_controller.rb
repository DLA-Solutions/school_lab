# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class ConversationsController < BaseController
          before_action :set_school_context!

          def index
            render_not_implemented
          end
        end
      end
    end
  end
end
