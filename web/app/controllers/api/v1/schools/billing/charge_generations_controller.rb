# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class ChargeGenerationsController < BaseController
          def create
            authorize Charge, :generate?

            result = ::Billing::GenerateChargesService.call(
              school: Current.school,
              billing_period: generation_params[:billing_period]
            )

            render_service_result(result, success_status: :created) do |data|
              render json: {
                data: {
                  created_charges: data.fetch(:created_charges).size,
                  skipped_contract_ids: data.fetch(:skipped_contract_ids)
                }
              }, status: :created
            end
          end

          private

          def generation_params
            params.permit(:billing_period)
          end
        end
      end
    end
  end
end
