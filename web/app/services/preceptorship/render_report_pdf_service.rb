# frozen_string_literal: true

require "prawn"

module Preceptorship
  # The report as a family receives it: one page, portrait, with the school at the head, who it is
  # about, who wrote it, and then the prose.
  #
  # Portrait and single-column, unlike the registers, because this is read rather than scanned —
  # it is a letter about a child, not a table of thirty of them.
  #
  # Rendered in-process with Prawn, like every other PDF here: no headless browser in the image,
  # and bytes deterministic enough to assert in a spec.
  class RenderReportPdfService < ApplicationService
    MARGIN = 56
    # Prose set the full width of an A4 page is hard to read; this keeps the measure sane without
    # needing a layout engine.
    BODY_SIZE = 11

    def initialize(report:)
      @report = report
    end

    def call
      ResponseService.success(data: { pdf: render, filename: filename })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252, which covers Portuguese in full but not every
      # alphabet. A name or a sentence outside it must surface as a clear refusal rather than a
      # 500 — the fix is to embed a Unicode font, not to mangle what a teacher wrote.
      Rails.logger.error(
        { event: "preceptorship_report.encoding_unsupported", school_id: report.school_id,
          report_id: report.id, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.report_unsupported_characters") ] }
      )
    end

    private

    attr_reader :report

    def filename
      student = report.student.name.parameterize
      "preceptoria-#{student}-#{issued_on.strftime('%Y-%m-%d')}.pdf"
    end

    # The date the family should see is when the school handed it over, not when the PDF happened
    # to be downloaded — two guardians printing the same report must not get two different dates.
    def issued_on
      (report.published_at || report.created_at).to_date
    end

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        pdf.text report.school.name, size: 14, style: :bold
        pdf.text I18n.t("reports.preceptorship.title"), size: 12
        # Formatted here rather than through `I18n.l`: the pt-BR locale carries no date formats,
        # and this is a Brazilian document whatever the interface language is.
        pdf.text "#{I18n.t('reports.issued_on')} #{issued_on.strftime('%d/%m/%Y')}",
                 size: 8, color: "666666"

        pdf.move_down 16
        facts.each { |label, value| pdf.text "#{label}: #{value}", size: 9, color: "444444" }

        pdf.move_down 18
        pdf.text report.body.to_s, size: BODY_SIZE, align: :justify, leading: 3
      end.render
    end

    def facts
      entries = [
        [ I18n.t("reports.preceptorship.student"), report.student.name ],
        [ I18n.t("reports.preceptorship.teacher"), report.teacher.name ]
      ]

      cohort = report.student.school_class
      entries << [ I18n.t("reports.preceptorship.cohort"), cohort.full_name ] if cohort

      period = report.academic_period
      entries << [ I18n.t("reports.preceptorship.period"), period.name ] if period

      entries
    end
  end
end
