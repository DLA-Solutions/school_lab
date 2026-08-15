# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class GuardiansController < BaseController
          def index
            authorize Guardian

            guardians = by_activation(policy_scope(Guardian)).search(params[:q]).order(:name)
            pagy, records = pagy(guardians)

            render json: {
              data: GuardianBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            render json: { data: GuardianBlueprint.render_as_hash(guardian) }
          end

          def create
            authorize Guardian

            result = ::People::CreateGuardianService.call(school: Current.school, params: guardian_params)
            render_service_result(result, success_status: :created) do |guardian|
              render json: { data: GuardianBlueprint.render_as_hash(guardian) }, status: :created
            end
          end

          def update
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            result = ::People::UpdateGuardianService.call(guardian: guardian, params: guardian_params)
            render_service_result(result) do |updated|
              render json: { data: GuardianBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            result = ::People::DiscardGuardianService.call(guardian: guardian, actor: Current.user)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          # Brings a record back. Looked up outside the policy scope on purpose: that scope is
          # `kept`, and an inactive record is precisely what this action operates on.
          def activate
            record = Current.school.guardians.find(params[:id])
            authorize record, :update?

            result = ::People::ActivateGuardianService.call(guardian: record, actor: Current.user)
            render_service_result(result) do |updated|
              render json: { data: GuardianBlueprint.render_as_hash(updated) }
            end
          end

          # Provisions whatever the guardian is missing — a user, a membership — and mails them
          # the link that sets their password. Safe to press twice: someone who already has an
          # account is sent a reset rather than a second invitation.
          def access
            record = Current.school.guardians.find(params[:id])
            authorize record, :update?

            result = ::People::SendGuardianAccessService.call(guardian: record, actor: Current.user)
            render_service_result(result) do |data|
              render json: { data: GuardianBlueprint.render_as_hash(data[:guardian]) }
            end
          end

          private

          # `active` (the default), `inactive` or `all`. Built from the school association rather
          # than the policy scope because that scope hides discarded rows, which is the whole
          # point of asking for the inactive ones.
          def by_activation(scope)
            case params[:status]
            when "inactive" then Current.school.guardians.discarded
            when "all" then Current.school.guardians.all
            else scope
            end
          end

          def guardian_params
            params.require(:guardian).permit(
              :name, :cpf, :email, :phone, :user_id, *Guardian::ADDRESS_FIELDS
            )
          end
        end
      end
    end
  end
end
