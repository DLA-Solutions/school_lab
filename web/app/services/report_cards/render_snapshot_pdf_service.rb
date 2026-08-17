# frozen_string_literal: true

require "prawn"

module ReportCards
  # Renders a stored snapshot payload to PDF bytes (BR-RC10).
  class RenderSnapshotPdfService < ApplicationService
    MARGIN = 48

    def initialize(snapshot_payload:, student_name:, period_name:, school_name:)
      @snapshot_payload = snapshot_payload
      @student_name = student_name
      @period_name = period_name
      @school_name = school_name
    end

    def call
      ResponseService.success(
        data: {
          pdf: render,
          filename: "boletim-#{student_name.parameterize}-#{period_name.parameterize}.pdf"
        }
      )
    end

    private

    attr_reader :snapshot_payload, :student_name, :period_name, :school_name

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"
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
      end.render
    end
  end
end
