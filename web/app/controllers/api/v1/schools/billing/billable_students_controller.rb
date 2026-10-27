# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # The avulso (one-off) charge flow's student picker: one row per enrolled student,
        # carrying the contract that stands for the child (or why none does), so staff pick a
        # student before choosing a billing period or amount downstream.
        class BillableStudentsController < BaseController
          include ::Billing::SchoolYearScoping

          def index
            authorize Charge, :generate?

            calendar_year = billing_school_year_calendar_year
            students = enrolled_students_for_billing(calendar_year).to_a.sort_by { |s| s.name.to_s.downcase }
            contracts = policy_scope(Contract).where(student_id: students.map(&:id))
                                              .includes(:billing_plan, :payer_guardian,
                                                        student: { student_guardians: :guardian })
            rows = ::Billing::StrictBillableStudents.rows_for(students, contracts)

            render json: {
              data: rows.map { |row| serialize_row(row) },
              meta: { school_year_id: params[:school_year_id].presence&.to_i }
            }
          end

          private

          def serialize_row(row)
            contract = row.contract
            payer = contract&.payer

            {
              student_id: row.student.id,
              student_name: row.student.name,
              contract_id: contract&.id,
              payer: payer && { id: payer.id, name: payer.name, cpf: payer.cpf },
              without_contract: row.without_contract?,
              tags: row.tags
            }
          end
        end
      end
    end
  end
end
