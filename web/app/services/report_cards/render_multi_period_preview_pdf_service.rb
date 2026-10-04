# frozen_string_literal: true

require "prawn"

module ReportCards
  # Renders the "all periods" teacher live preview (BR-RC14, AC-RC13): one Prawn::Document, one
  # grid with a column group per academic period (up to four), via the shared SnapshotPdfSection
  # -- not one page per period. A school year with zero periods still renders successfully (an
  # otherwise-empty PDF, header only) rather than failing: the same "never block the preview"
  # intent BR-RC14 already applies to a single period with missing grade data.
  class RenderMultiPeriodPreviewPdfService < ApplicationService
    MARGIN = 48

    # `sections` is an ordered array of { payload:, period_name:, sequence: } hashes -- one per
    # academic_period, already built by the caller (BuildLivePreviewPayloadService, once per
    # period) and ordered by `sequence`.
    def initialize(sections:, student_name:, student_cpf:, class_name:, school_name:)
      @sections = sections
      @student_name = student_name
      @student_cpf = student_cpf
      @class_name = class_name
      @school_name = school_name
    end

    def call
      ResponseService.success(
        data: {
          pdf: render,
          filename: "boletim-#{student_name.parameterize}-todos-os-periodos.pdf"
        }
      )
    end

    private

    attr_reader :sections, :student_name, :student_cpf, :class_name, :school_name

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"
        SnapshotPdfSection.draw(
          pdf,
          sections: sections,
          student_name: student_name,
          student_cpf: student_cpf,
          class_name: class_name,
          school_name: school_name
        )
      end.render
    end
  end
end
