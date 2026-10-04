# frozen_string_literal: true

require "prawn"

module ReportCards
  # Renders a stored snapshot payload to PDF bytes (BR-RC10). One academic period, by contract --
  # the real publish path (StageSnapshotService) always has exactly one, since a
  # report_card_publication is one aggregate per (school, student, period) (BR-RC03). Draws
  # through the shared SnapshotPdfSection so this and the multi-period teacher preview
  # (RenderMultiPeriodPreviewPdfService) are the same grid-drawing code.
  class RenderSnapshotPdfService < ApplicationService
    MARGIN = 48

    def initialize(snapshot_payload:, student_name:, student_cpf:, class_name:, period_name:, period_sequence:,
                    school_name:)
      @snapshot_payload = snapshot_payload
      @student_name = student_name
      @student_cpf = student_cpf
      @class_name = class_name
      @period_name = period_name
      @period_sequence = period_sequence
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

    attr_reader :snapshot_payload, :student_name, :student_cpf, :class_name, :period_name, :period_sequence,
                :school_name

    def render
      Prawn::Document.new(page_size: "A4", page_layout: :portrait, margin: MARGIN) do |pdf|
        pdf.font "Helvetica"
        SnapshotPdfSection.draw(
          pdf,
          sections: [ { payload: snapshot_payload, period_name: period_name, sequence: period_sequence } ],
          student_name: student_name,
          student_cpf: student_cpf,
          class_name: class_name,
          school_name: school_name
        )
      end.render
    end
  end
end
