# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class ContractsController < BaseController
          def index
            authorize Contract

            contracts = policy_scope(Contract).order(:id)
            pagy, records = pagy(contracts)

            render json: {
              data: ContractBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            contract = policy_scope(Contract).find(params[:id])
            authorize contract

            render json: { data: ContractBlueprint.render_as_hash(contract) }
          end

          def create
            authorize Contract

            contract = Current.school.contracts.build(contract_params)
            if contract.save
              render json: { data: ContractBlueprint.render_as_hash(contract) }, status: :created
            else
              render_error(:validation_error, status: :unprocessable_content,
                                               details: contract.errors.to_hash)
            end
          end

          def update
            contract = policy_scope(Contract).find(params[:id])
            authorize contract

            if contract.update(contract_params)
              render json: { data: ContractBlueprint.render_as_hash(contract) }
            else
              render_error(:validation_error, status: :unprocessable_content,
                                               details: contract.errors.to_hash)
            end
          end

          def destroy
            contract = policy_scope(Contract).find(params[:id])
            authorize contract

            contract.discard
            head :no_content
          end

          private

          def contract_params
            params.require(:contract).permit(
              :student_id, :billing_plan_id, :negotiated_amount_cents, :due_day,
              :starts_on, :ends_on, :status
            )
          end
        end
      end
    end
  end
end
