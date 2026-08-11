# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class ChargesController < BaseController
          def index
            authorize Charge

            charges = policy_scope(Charge).includes(:guardian, :applied_discounts, contract: :student)
                                          .order(due_date: :desc)
            charges = apply_filters(charges)
            pagy, records = pagy(charges)

            render json: {
              data: ChargeBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            charge = policy_scope(Charge).includes(:guardian, :applied_discounts, contract: :student)
                                         .find(params[:id])
            authorize charge

            render json: { data: ChargeBlueprint.render_as_hash(charge) }
          end

          # Raises a charge outside the monthly schedule. A contract is optional — the school also
          # bills for what nobody signed for — but a payer is not, so one is taken from the
          # request or, failing that, from whoever answers for the contract.
          def create
            authorize Charge, :create?

            contract_id = params.dig(:charge, :contract_id)
            contract = contract_id.present? ? policy_scope(Contract).find(contract_id) : nil

            guardian_id = params.dig(:charge, :guardian_id)
            guardian = guardian_id.present? ? policy_scope(Guardian).find(guardian_id) : nil

            result = ::Billing::CreateOneOffChargeService.call(
              school: Current.school, contract: contract, guardian: guardian,
              params: charge_params, actor: Current.user
            )

            render_service_result(result, success_status: :created) do |charge|
              render json: { data: ChargeBlueprint.render_as_hash(charge) }, status: :created
            end
          end

          def cancel
            charge = policy_scope(Charge).find(params[:id])
            authorize charge, :cancel?

            result = ::Billing::CancelChargeService.call(charge: charge)
            render_service_result(result) do |updated|
              render json: { data: ChargeBlueprint.render_as_hash(updated) }
            end
          end

          def reissue
            charge = policy_scope(Charge).find(params[:id])
            authorize charge, :reissue?

            result = ::Billing::ReissueChargeService.call(charge: charge)
            render_service_result(result) do |updated|
              render json: { data: ChargeBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            charge = policy_scope(Charge).find(params[:id])
            authorize charge

            result = ::Billing::DiscardChargeService.call(charge: charge, actor: Current.user)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          private

          def charge_params
            params.require(:charge).permit(:contract_id, :guardian_id, :total_amount_cents, :due_date, :description)
          end

          def apply_filters(scope)
            scope = search_by_payer(scope)
            scope = scope.where(status: statuses) if statuses.present?
            scope = scope.where(guardian_id: params[:guardian_id]) if params[:guardian_id].present?
            if params[:due_date_from].present?
              scope = scope.where(due_date: Date.parse(params[:due_date_from])..)
            end
            if params[:due_date_to].present?
              scope = scope.where(due_date: ..Date.parse(params[:due_date_to]))
            end
            scope
          end

          # One box over the payer's name and CPF: a secretary types what they have in front of
          # them without choosing a field first.
          def search_by_payer(scope)
            term = params[:q]
            return scope if term.blank?

            scope.where(guardian_id: policy_scope(Guardian).search(term).select(:id))
          end

          # `status` takes one value or several, so "open" can mean pending and overdue together —
          # a family with a late boleto has not paid it, and the screen says so as one thing.
          def statuses
            Array(params[:status]).flat_map { |value| value.to_s.split(",") }.map(&:strip).compact_blank
          end
        end
      end
    end
  end
end
