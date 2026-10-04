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
            academic_periods = resolve_academic_periods(student)

            result = ReportCards::RenderLivePreviewPdfService.call(
              student: student, academic_periods: academic_periods
            )

            render_service_result(result) { |data| send_live_preview_pdf(data) }
          end

          private

          # `academic_period_id=all` (AC-RC13) combines every period of the student's school
          # class's school year into one PDF, ordered by `sequence`. A year with zero periods
          # returns an empty list here -- RenderMultiPeriodPreviewPdfService still renders a
          # (near-empty) PDF for that, 200 rather than 404/422.
          def resolve_academic_periods(student)
            return all_periods_for(student) if params[:academic_period_id] == "all"

            [ Current.school.academic_periods.find(params[:academic_period_id]) ]
          end

          def all_periods_for(student)
            school_class = student.school_class
            return [] if school_class.blank?

            Current.school.academic_periods
                   .kept
                   .joins(:school_year)
                   .merge(SchoolYear.kept.for_calendar_year(school_class.year))
                   .order(:sequence)
                   .to_a
          end
        end
      end
    end
  end
end
