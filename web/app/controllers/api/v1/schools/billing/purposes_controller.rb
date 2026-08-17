# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class PurposesController < BaseController
          def index
            authorize BillingPurpose

            BillingPurpose.provision_defaults!(Current.school)
            records = policy_scope(BillingPurpose).ordered

            render json: { data: BillingPurposeBlueprint.render_as_hash(records) }
          end

          def create
            authorize BillingPurpose

            result = ::Billing::CreateBillingPurposeService.call(
              school: Current.school,
              params: purpose_params
            )

            render_service_result(result, success_status: :created) do |purpose|
              render json: { data: BillingPurposeBlueprint.render_as_hash(purpose) }, status: :created
            end
          end

          def update
            purpose = policy_scope(BillingPurpose).find(params[:id])
            authorize purpose

            result = ::Billing::UpdateBillingPurposeService.call(
              purpose: purpose,
              params: purpose_update_params,
              actor: Current.user
            )

            render_service_result(result) do |updated|
              render json: { data: BillingPurposeBlueprint.render_as_hash(updated) }
            end
          end

          private

          def purpose_params
            params.require(:billing_purpose).permit(:code, :name)
          end

          def purpose_update_params
            params.require(:billing_purpose).permit(:name, :tax_declaration_eligible, :acknowledge_legal_ownership)
          end
        end
      end
    end
  end
end
