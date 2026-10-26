# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # Issuing a month's boletos in one pass. `index` is what the school picks from — one
        # contract per enrolled student, with the amount it bills and whether the period is
        # already covered — and `create` raises and dispatches the selected ones.
        class ChargeBatchesController < BaseController
          def index
            authorize Charge, :generate?

            period = normalized_period
            return render_invalid_period if period.blank?

            render json: {
              data: rows(period),
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
                  ineligible_contract_ids: data.fetch(:ineligible_contract_ids),
                  contract_ids_without_payer: data.fetch(:contract_ids_without_payer)
                }
              }, status: :created
            end
          end

          private

          # One row per enrolled student, by name: the contract that stands for the child, or a
          # row flagged `without_contract` when none does so the school notices the gap.
          def rows(period)
            charged_ids = already_charged_ids(period)
            built = contracts.map { |contract| billable_row(contract, charged_ids) } +
                    students_without_contract.map { |student| without_contract_row(student) }

            built.sort_by { |row| [ row[:student_name].to_s.downcase, row[:contract_id].to_i ] }
          end

          def billable_contracts
            @billable_contracts ||= ::Billing::BulkBillableContracts.for(policy_scope(Contract))
          end

          def contracts
            @contracts ||= billable_contracts.includes(:billing_plan, :payer_guardian,
                                                       student: { student_guardians: :guardian })
                                             .to_a
          end

          def students_without_contract
            ::Billing::BulkBillableContracts.students_without_contract(Current.school.students, billable_contracts)
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
              student_id: contract.student_id,
              student_name: contract.student&.name,
              payer: payer && { id: payer.id, name: payer.name, cpf: payer.cpf },
              monthly_amount_cents: contract.negotiated_amount_cents ||
                contract.billing_plan&.base_amount_cents || 0,
              due_day: contract.due_day,
              already_charged: charged_ids.include?(contract.id),
              without_contract: false
            }
          end

          # Never billable: there is no contract to raise a charge against.
          def without_contract_row(student)
            {
              contract_id: nil,
              student_id: student.id,
              student_name: student.name,
              payer: nil,
              monthly_amount_cents: nil,
              due_day: nil,
              already_charged: false,
              without_contract: true
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
