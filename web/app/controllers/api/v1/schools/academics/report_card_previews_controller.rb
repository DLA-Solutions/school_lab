# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Teacher live, unpublished, cross-subject PDF preview of a student's boletim (BR-RC14,
        # UC-RC04). Renders from current grade/attendance state -- it never reads or creates a
        # report_card_publication or report_card_snapshot.
        class ReportCardPreviewsController < BaseController
          include ReportCardPdfDelivery

          def pdf
            authorize :report_card_preview, :show?

            student = Current.school.students.kept.find(params[:student_id])
            academic_period = Current.school.academic_periods.find(params[:academic_period_id])

            result = ReportCards::RenderLivePreviewPdfService.call(student: student, academic_period: academic_period)

            render_service_result(result) { |data| send_live_preview_pdf(data) }
          end
        end
      end
    end
  end
end
