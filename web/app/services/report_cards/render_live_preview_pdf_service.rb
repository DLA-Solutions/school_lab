# frozen_string_literal: true

module ReportCards
  # Orchestrates the teacher live preview PDF (BR-RC14, UC-RC04): build the current-state payload,
  # then render it through the same RenderSnapshotPdfService the publish path uses, so the preview
  # and a real published boletim are drawn by identical code. Creates no report_card_publication,
  # report_card_snapshot, or stored PDF -- the request is read-only and ephemeral by design.
  class RenderLivePreviewPdfService < ApplicationService
    def initialize(student:, academic_period:)
      @student = student
      @academic_period = academic_period
    end

    def call
      payload_result = BuildLivePreviewPayloadService.call(student: student, academic_period: academic_period)
      return payload_result if payload_result.failure?

      RenderSnapshotPdfService.call(
        snapshot_payload: payload_result.data,
        student_name: student.name,
        period_name: academic_period.name,
        school_name: student.school.name
      )
    end

    private

    attr_reader :student, :academic_period
  end
end
