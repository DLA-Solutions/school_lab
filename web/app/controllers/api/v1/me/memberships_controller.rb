# frozen_string_literal: true

module Api
  module V1
    module Me
      class MembershipsController < BaseController
        def accept
          membership = Current.user.memberships.kept.find(params[:id])
          authorize membership, :accept?

          result = ::People::AcceptMembershipService.call(membership: membership, user: Current.user)
          render_service_result(result) do |updated|
            render json: { data: MembershipBlueprint.render_as_hash(updated) }
          end
        end
      end
    end
  end
end
