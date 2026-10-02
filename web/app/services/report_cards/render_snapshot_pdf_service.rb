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
        SnapshotPdfSection.draw(
          pdf,
          snapshot_payload: snapshot_payload,
          student_name: student_name,
          period_name: period_name,
          school_name: school_name
        )
      end.render
    end
  end
end
