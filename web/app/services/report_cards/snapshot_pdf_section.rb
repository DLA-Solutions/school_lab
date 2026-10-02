# frozen_string_literal: true

module ReportCards
  # Draws one period's worth of boletim content onto an already-open Prawn::Document. Extracted
  # so RenderSnapshotPdfService (one page -- the real publish path, and the single-period teacher
  # preview) and the "all periods" teacher preview (BR-RC14's `academic_period_id=all`, AC-RC13,
  # one page per period via `start_new_page`) draw from the exact same code instead of two copies
  # that could drift apart.
  module SnapshotPdfSection
    module_function

    def draw(pdf, snapshot_payload:, student_name:, period_name:, school_name:)
      pdf.text school_name, size: 14, style: :bold
      pdf.text I18n.t("reports.report_card.title"), size: 12
      pdf.move_down 12
      pdf.text "#{I18n.t('reports.report_card.student')}: #{student_name}", size: 10
      pdf.text "#{I18n.t('reports.report_card.period')}: #{period_name}", size: 10
      pdf.move_down 16

      snapshot_payload.fetch("disciplines", []).each do |discipline|
        pdf.text discipline["subject_name"].to_s, size: 10, style: :bold
        pdf.text "#{I18n.t('reports.report_card.final_grade')}: #{discipline['final_value']}", size: 9
        pdf.move_down 8
      end

      attendance = snapshot_payload.fetch("attendance", {})
      pdf.move_down 8
      pdf.text I18n.t("reports.report_card.attendance"), size: 10, style: :bold
      pdf.text "#{attendance['percentage']}% (#{attendance['numerator']}/#{attendance['instructional_sessions']})",
               size: 9
    end
  end
end
