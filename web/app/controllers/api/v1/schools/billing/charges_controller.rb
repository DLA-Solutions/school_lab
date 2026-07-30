# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class ChargesController < BaseController
          def index
            authorize Charge

            charges = policy_scope(Charge).includes(:guardian, contract: :student).order(due_date: :desc)
            charges = apply_filters(charges)
            pagy, records = pagy(charges)

            render json: {
              data: ChargeBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            charge = policy_scope(Charge).includes(:guardian, contract: :student).find(params[:id])
            authorize charge

            render json: { data: ChargeBlueprint.render_as_hash(charge) }
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

          def apply_filters(scope)
            scope = scope.where(status: params[:status]) if params[:status].present?
            scope = scope.where(guardian_id: params[:guardian_id]) if params[:guardian_id].present?
            if params[:due_date_from].present?
              scope = scope.where(due_date: Date.parse(params[:due_date_from])..)
            end
            if params[:due_date_to].present?
              scope = scope.where(due_date: ..Date.parse(params[:due_date_to]))
            end
            scope
          end
        end
      end
    end
  end
end
