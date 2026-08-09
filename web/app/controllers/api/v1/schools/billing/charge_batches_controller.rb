# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # Issuing a month's boletos in one pass. `index` is what the school picks from — every
        # active contract with the amount it bills and whether the period is already covered —
        # and `create` raises and dispatches the selected ones.
        class ChargeBatchesController < BaseController
          def index
            authorize Charge, :generate?

            period = normalized_period
            return render_invalid_period if period.blank?

            render json: {
              data: contracts.map { |contract| billable_row(contract, already_charged_ids(period)) },
              meta: { billing_period: period.to_s }
            }
          end

          def create
            authorize Charge, :generate?

            result = ::Billing::BulkGenerateChargesService.call(
              school: Current.school,
              contract_ids: params[:contract_ids],
              billing_period: params[:billing_period],
              due_date: params[:due_date],
              actor: Current.user
            )

            render_service_result(result, success_status: :created) do |data|
              render json: {
                data: {
                  created_charges: ChargeBlueprint.render_as_hash(data.fetch(:created_charges)),
                  created_count: data.fetch(:created_charges).size,
                  skipped_contract_ids: data.fetch(:skipped_contract_ids),
                  contract_ids_without_payer: data.fetch(:contract_ids_without_payer)
                }
              }, status: :created
            end
          end

          private

          def contracts
            @contracts ||= policy_scope(Contract).active
                                                 .includes(:billing_plan, :payer_guardian,
                                                           student: { student_guardians: :guardian })
                                                 .order(id: :desc)
          end

          # One query for the whole batch: which of these contracts the period already covers.
          def already_charged_ids(period)
            @already_charged_ids ||= Charge.kept
                                           .where(school_id: Current.school.id, kind: "tuition",
                                                  billing_period: period,
                                                  contract_id: contracts.map(&:id))
                                           .pluck(:contract_id)
                                           .to_set
          end

          def billable_row(contract, charged_ids)
            payer = contract.payer

            {
              contract_id: contract.id,
              student_name: contract.student&.name,
              payer: payer && { id: payer.id, name: payer.name, cpf: payer.cpf },
              monthly_amount_cents: contract.negotiated_amount_cents ||
                contract.billing_plan&.base_amount_cents || 0,
              due_day: contract.due_day,
              already_charged: charged_ids.include?(contract.id)
            }
          end

          def normalized_period
            value = params[:billing_period].presence || Date.current.strftime("%Y-%m")
            value.match?(/\A\d{4}-\d{2}\z/) ? Date.strptime(value, "%Y-%m") : Date.parse(value).beginning_of_month
          rescue ArgumentError, TypeError
            nil
          end

          def render_invalid_period
            render_error(:validation_error, status: :unprocessable_content,
                                            details: { base: [ I18n.t("api.errors.charge_batch_invalid_period") ] })
          end
        end
      end
    end
  end
end
