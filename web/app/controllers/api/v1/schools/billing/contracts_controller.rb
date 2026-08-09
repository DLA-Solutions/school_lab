# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class ContractsController < BaseController
          def index
            authorize Contract

            contracts = filter_by_guardian(policy_scope(Contract).includes(:student))
            contracts = filter_by_signature_status(contracts).order(id: :desc)
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

            # Creating a contract here means sending it to the family for signature, so it starts
            # pending — not silently in force. The send itself is a separate step: the contract is
            # saved first so a provider outage leaves a contract to retry rather than nothing.
            contract = Current.school.contracts.build(contract_params)
            contract.signature_status = "pending_signature"

            unless contract.save
              return render_error(:validation_error, status: :unprocessable_content,
                                                     details: contract.errors.to_hash)
            end

            render json: { data: ContractBlueprint.render_as_hash(contract) }, status: :created
          end

          # Renders the agreement and sends it to the guardians through the school's e-signature
          # provider. Separate from create so a failed send can be retried without a duplicate
          # contract, and so an existing contract can be dispatched later.
          def send_for_signature
            contract = policy_scope(Contract).find(params[:id])
            authorize contract, :update?

            result = ::Contracts::SendForSignatureService.call(contract: contract, actor: Current.user)
            render_service_result(result) do |data|
              render json: { data: ContractBlueprint.render_as_hash(data[:contract].reload) }
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

          # Records that the family returned the signed contract. Stands in for the callback an
          # e-signature provider would make, until one is integrated.
          def sign
            contract = policy_scope(Contract).find(params[:id])
            authorize contract, :update?

            if contract.mark_signed!
              render json: { data: ContractBlueprint.render_as_hash(contract) }
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: contract.errors.to_hash)
            end
          end

          private

          # The contracts of one guardian's children — what the guardian-facing screen lists.
          def filter_by_guardian(scope)
            guardian_id = params[:guardian_id]
            return scope if guardian_id.blank?

            scope.joins(student: :student_guardians)
                 .merge(StudentGuardian.kept)
                 .where(student_guardians: { guardian_id: guardian_id })
                 .distinct
          end

          def filter_by_signature_status(scope)
            status = params[:signature_status]
            return scope if status.blank?
            return scope.none unless Contract::SIGNATURE_STATUSES.include?(status)

            scope.where(signature_status: status)
          end

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
