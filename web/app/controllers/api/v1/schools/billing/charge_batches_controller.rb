# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # Issuing a month's boletos in one pass. `index` is what the school picks from — one
        # contract per enrolled student, with the amount it bills and whether the period is
        # already covered — and `create` raises and dispatches the selected ones.
        class ChargeBatchesController < BaseController
          include ::Billing::SchoolYearScoping

          def index
            authorize Charge, :generate?

            period = normalized_period
            return render_invalid_period if period.blank?

            calendar_year = billing_school_year_calendar_year
            students = enrolled_students_for_billing(calendar_year).to_a.sort_by { |s| s.name.to_s.downcase }
            contracts = policy_scope(Contract).where(student_id: students.map(&:id))
                                              .includes(:billing_plan, :payer_guardian,
                                                        student: { student_guardians: :guardian })
            rows = ::Billing::StrictBillableStudents.rows_for(students, contracts)
            charged_ids = already_charged_ids(period, rows)

            render json: {
              data: rows.map { |row| serialize_row(row, charged_ids) },
              meta: { billing_period: period.to_s, school_year_id: params[:school_year_id].presence&.to_i }
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

          def serialize_row(row, charged_ids)
            return without_contract_row(row) if row.contract.blank?

            contract = row.contract
            payer = contract.payer

            {
              contract_id: contract.id,
              student_id: row.student.id,
              student_name: row.student.name,
              payer: payer && { id: payer.id, name: payer.name, cpf: payer.cpf },
              payer_missing_reason: payer.blank? ? "no_guardian_linked" : nil,
              monthly_amount_cents: contract.negotiated_amount_cents ||
                contract.billing_plan&.base_amount_cents || 0,
              due_day: contract.due_day,
              already_charged: charged_ids.include?(contract.id),
              without_contract: false,
              tags: []
            }
          end

          def without_contract_row(row)
            {
              contract_id: nil,
              student_id: row.student.id,
              student_name: row.student.name,
              payer: nil,
              payer_missing_reason: nil,
              monthly_amount_cents: nil,
              due_day: nil,
              already_charged: false,
              without_contract: row.without_contract?,
              tags: row.tags
            }
          end

          # One query for the whole batch: which of these chosen contracts the period already covers.
          def already_charged_ids(period, rows)
            contract_ids = rows.filter_map { |row| row.contract&.id }

            Charge.kept
                  .where(school_id: Current.school.id, kind: "tuition", billing_period: period,
                         contract_id: contract_ids)
                  .pluck(:contract_id)
                  .to_set
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
