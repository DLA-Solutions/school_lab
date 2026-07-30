# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class ChargesController < BaseController
          def index
            authorize Charge

            charges = policy_scope(Charge).open
                                          .includes(contract: :student)
                                          .order(due_date: :asc)
            pagy, records = pagy(charges)

            render json: {
              data: ChargeBlueprint.render_as_hash(records, view: :guardian),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def history
            authorize Charge, :index?

            charges = policy_scope(Charge).where(status: :paid)
                                          .includes(:payments, contract: :student)
                                          .order(updated_at: :desc)
            pagy, records = pagy(charges)

            render json: {
              data: ChargeBlueprint.render_as_hash(records, view: :guardian_history),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            charge = policy_scope(Charge).includes(contract: :student).find(params[:id])
            authorize charge

            render json: { data: ChargeBlueprint.render_as_hash(charge, view: :guardian) }
          end

          def reissue
            charge = policy_scope(Charge).find(params[:id])
            authorize charge, :reissue?

            result = ::Billing::ReissueChargeService.call(charge: charge)
            render_service_result(result) do |updated|
              render json: { data: ChargeBlueprint.render_as_hash(updated, view: :guardian) }
            end
          end
        end
      end
    end
  end
end
