# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # The staff review queue for bank-created boletos a CPF match could not link to a
        # guardian (Billing::ImportExternalBoletosService). `index` defaults to the open queue
        # (`pending`); `resolve`/`dismiss` close one row out, per Billing::ResolveUnmatchedBoletoService
        # and Billing::DismissUnmatchedBoletoService.
        class UnmatchedBoletosController < BaseController
          def index
            authorize UnmatchedBoleto

            scope = policy_scope(UnmatchedBoleto).order(created_at: :asc)
            scope = apply_status_filter(scope)
            pagy, records = pagy(scope)

            render json: {
              data: UnmatchedBoletoBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def resolve
            record = policy_scope(UnmatchedBoleto).find(params[:id])
            authorize record, :resolve?

            guardian = policy_scope(Guardian).find(params[:guardian_id])

            result = ::Billing::ResolveUnmatchedBoletoService.call(
              unmatched_boleto: record, guardian: guardian, actor: Current.user
            )
            render_service_result(result) do |updated|
              render json: { data: UnmatchedBoletoBlueprint.render_as_hash(updated) }
            end
          end

          def dismiss
            record = policy_scope(UnmatchedBoleto).find(params[:id])
            authorize record, :dismiss?

            result = ::Billing::DismissUnmatchedBoletoService.call(unmatched_boleto: record, actor: Current.user)
            render_service_result(result) do |updated|
              render json: { data: UnmatchedBoletoBlueprint.render_as_hash(updated) }
            end
          end

          private

          # Staff opens this screen to work the queue, not to browse history — no status filter
          # means pending only. An explicit, invalid value is dropped rather than silently
          # returning everything.
          def apply_status_filter(scope)
            status = params[:status].presence
            return scope.where(status: "pending") if status.blank?
            return scope.where(status: "pending") unless UnmatchedBoleto::STATUSES.include?(status)

            scope.where(status: status)
          end
        end
      end
    end
  end
end
