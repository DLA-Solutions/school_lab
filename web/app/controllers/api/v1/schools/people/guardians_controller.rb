# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class GuardiansController < BaseController
          def index
            authorize Guardian

            guardians = policy_scope(Guardian).order(:name)
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

          private

          def guardian_params
            params.require(:guardian).permit(:name, :cpf, :email, :phone, :user_id)
          end
        end
      end
    end
  end
end
