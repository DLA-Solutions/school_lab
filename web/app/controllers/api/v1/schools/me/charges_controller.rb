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

            scope = filter_charges_by_student(policy_scope(Charge).includes(:charge_issuances, contract: :student))
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
            charge = policy_scope(Charge).includes(:charge_issuances, contract: :student).find(params[:id])
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

          # Streams the boleto PDF for providers that only serve it through an authenticated API
          # (Banco Inter). The SPA cannot call the provider directly (mTLS + OAuth). Nothing is
          # stored: each call fetches it, and the response is marked uncacheable (payer PII).
          def boleto_pdf
            charge = policy_scope(Charge).includes(:charge_issuances).find(params[:id])
            authorize charge, :boleto_pdf?

            result = ::Billing::FetchBoletoPdfService.call(charge: charge)
            render_service_result(result) do |pdf|
              response.headers["Cache-Control"] = "private, no-store"
              send_data pdf.content, filename: pdf.filename, type: "application/pdf", disposition: "inline"
            end
          end

          private

          def error_status_for(code)
            case code.to_sym
            when :boleto_pdf_unavailable then :conflict
            when :boleto_pdf_provider_error then :bad_gateway
            when :boleto_pdf_provider_unavailable then :service_unavailable
            else super
            end
          end

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
