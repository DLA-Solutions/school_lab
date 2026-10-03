# frozen_string_literal: true

require "prawn/table"

module ReportCards
  # Draws the boletim grid onto an already-open Prawn::Document: a header (school, student,
  # CPF, turma), one grid with a row per visible discipline and columns grouped by academic
  # period, and attendance lines below. Shared by RenderSnapshotPdfService (one period -- the
  # real publish path, and the single-period teacher preview) and
  # RenderMultiPeriodPreviewPdfService (BR-RC14's `academic_period_id=all`, AC-RC13, up to four
  # periods as column groups in the same grid) so a published boletim and a teacher preview are
  # drawn by identical code (BR-RC10).
  module SnapshotPdfSection
    module_function

    # Fixed, positional sub-column labels within a period group: two regular grades, then an
    # optional "work" grade named after the period's own sequence -- never the component's
    # school-configured `name`, which is free text schools reuse across periods (see
    # BuildLivePreviewPayloadService#component_payload / MaterializeSnapshotService's twin). A
    # 4th+ component in the same period is out of this grid's scope: rendered as no column at all,
    # never a crash.
    MAX_COMPONENTS_PER_PERIOD = 2

    # `sections` is an ordered array of { payload:, period_name:, sequence: } -- one per academic
    # period being rendered, length 1 for a single period, up to 4 for `academic_period_id=all`.
    # An empty array (a school year with zero periods) still draws the header, just no grid/
    # attendance lines -- the caller gets a 200 with an otherwise-empty PDF, never a crash.
    def draw(pdf, sections:, student_name:, student_cpf:, class_name:, school_name:)
      draw_header(pdf, student_name: student_name, student_cpf: student_cpf, class_name: class_name,
                       school_name: school_name)
      return if sections.empty?

      draw_grid(pdf, sections)
      draw_attendance(pdf, sections)
    end

    def draw_header(pdf, student_name:, student_cpf:, class_name:, school_name:)
      pdf.text school_name, size: 14, style: :bold
      pdf.text I18n.t("reports.report_card.title"), size: 12
      pdf.move_down 12
      pdf.text "#{I18n.t('reports.report_card.student')}: #{student_name}", size: 10
      pdf.text "#{I18n.t('reports.report_card.cpf')}: #{student_cpf}", size: 10
      pdf.text "#{I18n.t('reports.report_card.cohort')}: #{class_name}", size: 10
      pdf.move_down 16
    end

    def draw_grid(pdf, sections)
      disciplines = reference_disciplines(sections)
      return if disciplines.empty?

      data_rows = disciplines.map { |discipline| grid_data_row(discipline, sections) }
      rows = grid_header_rows(sections) + data_rows

      pdf.table(rows, header: true, width: pdf.bounds.width) do |table|
        table.rows(0..1).font_style = :bold
        table.rows(0..1).background_color = "EEEEEE"
        table.cells.size = 8
        table.cells.padding = [ 4, 6 ]
        table.cells.borders = [ :bottom ]
      end
    end

    # Disciplines don't vary by period -- they belong to the student's school class, not the
    # period -- so the first section's list stands in for all of them; same set, same order,
    # every period.
    def reference_disciplines(sections)
      sections.first.fetch(:payload).fetch("disciplines", [])
    end

    def grid_header_rows(sections)
      [
        [ { content: I18n.t("reports.report_card.discipline"), rowspan: 2 } ] +
          sections.map { |section| { content: section.fetch(:period_name), colspan: sub_labels(section).size } },
        sections.flat_map { |section| sub_labels(section) }
      ]
    end

    def sub_labels(section)
      [ "N1", "N2", "T#{section.fetch(:sequence)}" ]
    end

    def grid_data_row(discipline, sections)
      [ discipline["subject_name"] ] + sections.flat_map { |section| component_values(discipline, section) }
    end

    def component_values(discipline, section)
      row = section.fetch(:payload).fetch("disciplines", []).find do |candidate|
        candidate["class_discipline_id"] == discipline["class_discipline_id"]
      end
      components = row&.fetch("components", []) || []

      # N1, N2, then one optional work grade -- never a 4th.
      (0..MAX_COMPONENTS_PER_PERIOD).map { |index| components[index]&.fetch("value", nil).to_s }
    end

    def draw_attendance(pdf, sections)
      pdf.move_down 8
      pdf.text I18n.t("reports.report_card.attendance"), size: 10, style: :bold
      sections.each do |section|
        attendance = section.fetch(:payload).fetch("attendance", {})
        pdf.text "#{section.fetch(:period_name)}: #{attendance['percentage']}% " \
                 "(#{attendance['numerator']}/#{attendance['instructional_sessions']})", size: 9
      end
    end
  end
end
