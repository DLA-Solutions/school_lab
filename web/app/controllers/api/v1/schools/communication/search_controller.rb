# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Communication
        class SearchController < BaseController
          before_action :set_school_context!

          def index
            authorize Conversation, :roster?

            result = ::Communication::SearchRosterService.call(
              school: Current.school,
              actor_membership: Current.membership,
              query: params[:q]
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
