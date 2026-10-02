# frozen_string_literal: true

require "prawn"

module ReportCards
  # Renders the "all periods" teacher live preview (BR-RC14, AC-RC13): one Prawn::Document, one
  # SnapshotPdfSection per academic period in the order given, each on its own page. Builds one
  # PDF directly rather than merging several -- no PDF-merging gem needed.
  #
  # A school year with zero periods still renders successfully (an otherwise-empty PDF) rather
  # than failing: the same "never block the preview" intent BR-RC14 already applies to a single
  # period with missing grade data.
  class RenderMultiPeriodPreviewPdfService < ApplicationService
    MARGIN = 48

    # `sections` is an ordered array of { payload:, period_name: } hashes -- one per
    # academic_period, already built by the caller (e.g. BuildLivePreviewPayloadService per
    # period) and ordered by `sequence`.
    def initialize(sections:, student_name:, school_name:)
      @sections = sections
      @student_name = student_name
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

    attr_reader :sections, :student_name, :school_name

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"
        sections.each_with_index do |section, index|
          pdf.start_new_page if index.positive?
          SnapshotPdfSection.draw(
            pdf,
            snapshot_payload: section.fetch(:payload),
            student_name: student_name,
            period_name: section.fetch(:period_name),
            school_name: school_name
          )
        end
      end.render
    end
  end
end
