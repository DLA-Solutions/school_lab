# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        module Reports
          # What each class is expected to bring in per month, as a PDF for the school to print:
          # one class per page, the children, their guardians and the amount of each contract.
          class ExpectedPaymentsController < Billing::BaseController
            def show
              authorize :expected_payments_report, :show?, policy_class: ExpectedPaymentsReportPolicy

              statuses = ::Billing::RenderExpectedPaymentsReportService::STATUSES
              if params[:status].present? && statuses.exclude?(params[:status])
                return render_error(:validation_error, status: :unprocessable_content,
                                                       details: { status: [ I18n.t("api.errors.invalid_report_status") ] })
              end

              result = ::Billing::RenderExpectedPaymentsReportService.call(
                school: Current.school,
                contracts: policy_scope(Contract),
                # Looked up through the school, so a class from another school is a plain 404.
                school_class: requested_school_class,
                status: params[:status],
                columns: params[:columns].to_s.split(",")
              )

              # A name Prawn's built-in fonts cannot draw comes back as a refusal, not a 500.
              if result.failure?
                return render_error(result.error_code, status: :unprocessable_content,
                                                       details: result.details)
              end

              send_data result.data.fetch(:pdf),
                        filename: result.data.fetch(:filename),
                        type: "application/pdf",
                        disposition: "attachment"
            end

            private

            def requested_school_class
              return if params[:school_class_id].blank?

              Current.school.school_classes.kept.find(params[:school_class_id])
            end
          end
        end
      end
    end
  end
end
