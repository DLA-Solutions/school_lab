# frozen_string_literal: true

require "prawn"
require "prawn/table"

module People
  # The guardian register as a printable table, with only the columns the school asked for.
  #
  # Rendered in-process with Prawn, like the contract PDF: no headless browser in the image, and
  # bytes deterministic enough to assert in a spec.
  #
  # A guardian with more than one child enrolled produces one row per child — the school printing
  # this is looking at families and classes, and folding the children into a single cell makes the
  # class column meaningless. A guardian with no child on the roll still appears, with those two
  # columns blank: they are on the register, and leaving them out would make the report disagree
  # with the listing it was printed from.
  class RenderGuardiansReportService < ApplicationService
    MARGIN = 40

    # What may be asked for, in the order the table draws them. Anything not on this list is
    # ignored rather than trusted — the columns come from a query string.
    COLUMNS = {
      "name" => { header: "Responsável", width: 150 },
      "cpf" => { header: "CPF", width: 100 },
      "phone" => { header: "Telefone", width: 100 },
      "email" => { header: "E-mail", width: 150 },
      "student_name" => { header: "Filho(a)", width: 140 },
      "student_class" => { header: "Turma", width: 160 }
    }.freeze

    DEFAULT_COLUMNS = %w[name cpf phone student_name student_class].freeze

    def initialize(school:, guardians:, columns: nil)
      @school = school
      @guardians = guardians
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
        { event: "guardians_report.encoding_unsupported", school_id: school.id,
          message: e.message }.to_json
      )

      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.report_unsupported_characters") ] }
      )
    end

    private

    attr_reader :school, :guardians, :columns

    # Unknown names are dropped and the order is ours, not the caller's, so the table cannot be
    # made to draw a column twice or to reach for an attribute nobody meant to publish.
    def sanitize(requested)
      asked = Array(requested).map(&:to_s)
      chosen = COLUMNS.keys & asked

      chosen.presence || DEFAULT_COLUMNS
    end

    def filename
      "responsaveis-#{school.name.parameterize}-#{Date.current.strftime('%Y-%m-%d')}.pdf"
    end

    # One row per guardian-child pair; one row with blanks for a guardian with no child enrolled.
    def rows
      guardians.flat_map do |guardian|
        students = guardian.students.kept.to_a

        if students.empty? || (columns & %w[student_name student_class]).empty?
          [ row_for(guardian, nil) ]
        else
          students.map { |student| row_for(guardian, student) }
        end
      end
    end

    def row_for(guardian, student)
      columns.map do |column|
        case column
        when "name" then guardian.name.to_s
        when "cpf" then Cpf.format(guardian.cpf).to_s
        when "phone" then guardian.phone.to_s
        when "email" then guardian.email.to_s
        when "student_name" then student&.name.to_s
        # Named in full: the letter alone repeats in every grade and both shifts.
        when "student_class" then student&.school_class&.full_name.to_s
        end
      end
    end

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :landscape, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"

        pdf.text school.name, size: 14, style: :bold
        pdf.text "Relação de responsáveis", size: 11
        # Formatted here rather than through `I18n.l`: the pt-BR locale carries no date formats,
        # and the report is a Brazilian document whatever the interface language is.
        pdf.text "Emitido em #{Date.current.strftime('%d/%m/%Y')}", size: 8, color: "666666"
        pdf.move_down 12

        body = rows

        if body.empty?
          pdf.text "Nenhum responsável para os filtros escolhidos.", size: 10
        else
          pdf.table([ headers ] + body, header: true, width: pdf.bounds.width) do |table|
            table.row(0).font_style = :bold
            table.row(0).background_color = "EEEEEE"
            table.cells.size = 8
            table.cells.padding = [ 4, 6 ]
            table.cells.borders = [ :bottom ]
          end
        end

        # Drawn last so the count reflects the rows actually printed, children included.
        pdf.move_down 10
        pdf.text "#{body.size} linha(s)", size: 8, color: "666666"
      end.render
    end

    def headers
      columns.map { |column| COLUMNS.fetch(column)[:header] }
    end
  end
end
