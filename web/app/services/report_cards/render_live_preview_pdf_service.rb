# frozen_string_literal: true

module ReportCards
  # Orchestrates the teacher live preview PDF (BR-RC14, UC-RC04): build the current-state payload
  # for each given academic period, then render through the same drawing code the publish path
  # uses, so the preview and a real published boletim are drawn by identical code. Creates no
  # report_card_publication, report_card_snapshot, or stored PDF -- the request is read-only and
  # ephemeral by design.
  #
  # `academic_periods` is always an array -- the ordinary single-period preview passes one record,
  # and `academic_period_id=all` (AC-RC13) passes every period of the student's school class's
  # school year, ordered by `sequence`. A single resulting section still renders through
  # RenderSnapshotPdfService (unchanged contract, same as the real publish path); more than one
  # renders through RenderMultiPeriodPreviewPdfService -- one grid, one column group per period,
  # not one page per period.
  class RenderLivePreviewPdfService < ApplicationService
    def initialize(student:, academic_periods:)
      @student = student
      @academic_periods = academic_periods
    end

    def call
      sections = []

      academic_periods.each do |academic_period|
        payload_result = BuildLivePreviewPayloadService.call(student: student, academic_period: academic_period)
        return payload_result if payload_result.failure?

        sections << {
          payload: payload_result.data,
          period_name: academic_period.name,
          sequence: academic_period.sequence
        }
      end

      render(sections)
    end

    private

    attr_reader :student, :academic_periods

    def render(sections)
      common = { student_cpf: student.formatted_cpf, class_name: class_name, school_name: student.school.name }

      if sections.size == 1
        single_section = sections.first
        RenderSnapshotPdfService.call(
          snapshot_payload: single_section.fetch(:payload),
          student_name: student.name,
          period_name: single_section.fetch(:period_name),
          period_sequence: single_section.fetch(:sequence),
          **common
        )
      else
        RenderMultiPeriodPreviewPdfService.call(sections: sections, student_name: student.name, **common)
      end
    end

    # Defensive: a student is required to carry a school_class (model validation), but a legacy
    # record could still lack one -- never crash the header over it, just show it blank.
    def class_name
      student.school_class&.full_name.to_s
    end
  end
end
