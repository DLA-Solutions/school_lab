# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class ChargesController < BaseController
          # Unified family list (paid, pending, overdue) when `status` is sent; without it, the
          # legacy open-boletos list. Filters are validated by Billing::FilterGuardianChargesService.
          def index
            authorize Charge

            scope = filter_charges_by_student(policy_scope(Charge).includes(contract: :student))
            result = ::Billing::FilterGuardianChargesService.call(scope: scope, params: list_filter_params)
            render_service_result(result) do |charges|
              pagy, records = pagy(charges)

              render json: {
                data: ChargeBlueprint.render_as_hash(records, view: :guardian, **list_render_options),
                meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
              }
            end
          end

          def history
            authorize Charge, :index?

            charges = filter_charges_by_student(
              policy_scope(Charge).where(status: :paid)
                                  .includes(:payments, contract: :student)
                                  .order(updated_at: :desc)
            )
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

          private

          def list_filter_params
            params.slice(:status, :month, :year, :from, :to, :order)
                  .permit(:status, :month, :year, :from, :to, :order, status: []).to_h
          end

          def list_render_options
            { interest_rate_percent: ::Billing::SchoolSettings.for(Current.school).interest_rate_percent&.to_f }
          end

          def filter_charges_by_student(scope)
            return scope if params[:student_id].blank?

            student = policy_scope(Student).find(params[:student_id])
            scope.joins(:contract).where(contracts: { student_id: student.id })
          end
        end
      end
    end
  end
end
