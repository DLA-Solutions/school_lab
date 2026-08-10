# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class MembershipsController < BaseController
          def index
            authorize Membership

            memberships = policy_scope(Membership).includes(:user).order(:id)
            pagy, records = pagy(memberships)

            render json: {
              data: MembershipBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize Membership

            result = ::People::CreateMembershipService.call(school: Current.school, params: membership_params)
            render_service_result(result, success_status: :created) do |membership|
              render json: { data: MembershipBlueprint.render_as_hash(membership) }, status: :created
            end
          end

          def update
            membership = policy_scope(Membership).find(params[:id])
            authorize membership

            result = ::People::UpdateMembershipService.call(
              membership: membership,
              params: membership_update_params,
              actor: Current.user
            )
            render_service_result(result) do |updated|
              render json: { data: MembershipBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            membership = policy_scope(Membership).find(params[:id])
            authorize membership

            result = ::People::DiscardMembershipService.call(membership: membership)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          def invite
            membership = policy_scope(Membership).find(params[:id])
            authorize membership, :invite?

            result = ::People::InviteMembershipService.call(membership: membership)
            render_service_result(result) do |updated|
              render json: { data: MembershipBlueprint.render_as_hash(updated) }
            end
          end

          def permissions
            membership = policy_scope(Membership).find(params[:id])
            authorize membership, :update_permissions?

            result = Identity::UpdateMembershipPermissionsService.call(
              membership: membership,
              grants: permission_params[:grants],
              denies: permission_params[:denies]
            )
            render_service_result(result) do |updated|
              render json: { data: MembershipBlueprint.render_as_hash(updated) }
            end
          end

          private

          def membership_params
            params.require(:membership).permit(:email, :role, :role_template_id, :segment_id, :display_title)
          end

          def membership_update_params
            params.require(:membership).permit(:status)
          end

          def permission_params
            params.permit(grants: [], denies: [])
          end
        end
      end
    end
  end
end
