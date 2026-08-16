# frozen_string_literal: true

require "prawn"
require "prawn/table"

module People
  # Shared shape of the printable registers: a table of chosen columns, grouped by cohort and laid
  # out in teaching order — Infantil I through V, then Fundamental I, then Fundamental II.
  #
  # Each cohort starts a new page. A grouped report read as one long table makes the reader find
  # the boundaries themselves, and these are printed to be handed around a school one class at a
  # time.
  #
  # Rendered in-process with Prawn, like the contract PDF: no headless browser in the image, and
  # bytes deterministic enough to assert in a spec.
  #
  # Subclasses say what the columns are and how a row is built; everything else is here.
  class RegisterReportService < ApplicationService
    MARGIN = 40

    # Cohorts sort by the curriculum; whoever has no cohort is printed last, under their own
    # heading, rather than dropped — a register that quietly omitted them would disagree with the
    # listing it was printed from.
    NO_COHORT_POSITION = Float::INFINITY

    def initialize(school:, columns: nil)
      @school = school
      @columns = sanitize(columns)
    end

    def call
      ResponseService.success(data: { pdf: render, filename: filename })
    rescue Prawn::Errors::IncompatibleStringEncoding => e
      # Prawn's built-in fonts are Windows-1252, which covers Portuguese in full — accents, the em
      # dash and the middle dot the cohort label uses — but not every alphabet. A name outside it
      # must surface as a clear refusal rather than a 500, and the fix is to embed a Unicode font,
      # not to mangle somebody's name on the way into a report.
      Rails.logger.error(
        { event: "register_report.encoding_unsupported", school_id: school.id,
          report: self.class.name, message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.report_unsupported_characters") ] }
      )
    end

    private

    attr_reader :school, :columns

    # Implemented by each report.
    def available_columns = raise(NotImplementedError)
    def default_columns = raise(NotImplementedError)
    def report_title = raise(NotImplementedError)
    def slug = raise(NotImplementedError)

    # `{ school_class_or_nil => [row, ...] }`, in whatever order; this class sorts it.
    def grouped_rows = raise(NotImplementedError)

    # Unknown names are dropped and the order is ours, not the caller's, so the table cannot be
    # made to draw a column twice or to reach for an attribute nobody meant to publish.
    def sanitize(requested)
      asked = Array(requested).map(&:to_s)
      chosen = available_columns.keys & asked

      chosen.presence || default_columns
    end

    def filename
      "#{slug}-#{school.name.parameterize}-#{Date.current.strftime('%Y-%m-%d')}.pdf"
    end

    def headers
      columns.map { |column| available_columns.fetch(column)[:header] }
    end

    def sorted_groups
      grouped_rows.sort_by do |school_class, _rows|
        next [ NO_COHORT_POSITION, 0, "" ] if school_class.nil?

        # Year last: a school printing the register wants this year's cohorts in teaching order,
        # not every "5º ano" that ever existed bunched together.
        [ school_class.curricular_position, -school_class.year, school_class.name.to_s ]
      end
    end

    def render
      groups = sorted_groups

      Prawn::Document.new(page_size: "A4", page_layout: :landscape, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        if groups.empty?
          draw_heading(pdf)
          pdf.text I18n.t("reports.empty"), size: 10
          next
        end

        groups.each_with_index do |(school_class, rows), index|
          # Each cohort on its own page, so a report can be handed round a class at a time.
          pdf.start_new_page if index.positive?

          draw_heading(pdf)
          pdf.text cohort_heading(school_class), size: 11, style: :bold
          pdf.text I18n.t("reports.row_count", count: rows.size), size: 8, color: "666666"
          pdf.move_down 8

          draw_table(pdf, rows)
        end
      end.render
    end

    def draw_heading(pdf)
      pdf.text school.name, size: 14, style: :bold
      pdf.text report_title, size: 11
      # Formatted here rather than through `I18n.l`: the pt-BR locale carries no date formats, and
      # the report is a Brazilian document whatever the interface language is.
      pdf.text "#{I18n.t('reports.issued_on')} #{Date.current.strftime('%d/%m/%Y')}",
               size: 8, color: "666666"
      pdf.move_down 10
    end

    def cohort_heading(school_class)
      return I18n.t("reports.without_cohort") if school_class.nil?

      school_class.full_name
    end

    def draw_table(pdf, rows)
      pdf.table([ headers ] + rows, header: true, width: pdf.bounds.width) do |table|
        table.row(0).font_style = :bold
        table.row(0).background_color = "EEEEEE"
        table.cells.size = 8
        table.cells.padding = [ 4, 6 ]
        table.cells.borders = [ :bottom ]
      end
    end
  end
end
