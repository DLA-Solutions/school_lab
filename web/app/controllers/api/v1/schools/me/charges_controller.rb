# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class ChargesController < BaseController
          # Unified guardian list — pending, overdue, and paid together (never cancelled), always
          # ascending by due date. Replaces the old open/history tab split; optional `status` and
          # `due_date_from`/`due_date_to` let a family narrow it without a second endpoint.
          def index
            authorize Charge

            charges = filter_charges_by_student(
              apply_charge_filters(
                policy_scope(Charge).guardian_visible
                                    .includes(:payments, contract: :student)
                                    .order(due_date: :asc)
              )
            )
            pagy, records = pagy(charges)

            render json: {
              data: ChargeBlueprint.render_as_hash(records, view: :guardian),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          # Legacy endpoint kept alive for mobile (`mobile/src/services/charges.ts`), which still
          # calls it for paid-only history. The web SPA no longer uses this — it reads paid
          # charges from the unified `index` list above instead.
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

          def filter_charges_by_student(scope)
            return scope if params[:student_id].blank?

            student = policy_scope(Student).find(params[:student_id])
            scope.joins(:contract).where(contracts: { student_id: student.id })
          end

          # `status` narrows within the already-guardian_visible set, so an unknown value (or
          # `cancelled`) simply yields no rows rather than ever leaking outside it. Date bounds
          # follow the same `due_date_from`/`due_date_to` convention as the staff billing index
          # (`Api::V1::Schools::Billing::ChargesController#apply_filters`).
          def apply_charge_filters(scope)
            scope = scope.where(status: params[:status]) if params[:status].present?
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
