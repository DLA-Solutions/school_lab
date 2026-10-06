# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class RosterController < BaseController
          before_action :set_school_context!

          def index
            authorize Conversation, :roster?

            result = ::Communication::ListRosterService.call(
              school: Current.school,
              actor_membership: Current.membership,
              school_class_id: params[:school_class_id]
            )

            render_service_result(result) do |rows|
              render json: { data: RosterBlueprint.render_as_hash(rows) }
            end
          end
        end
      end
    end
  end
end
