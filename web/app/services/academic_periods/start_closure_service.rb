# frozen_string_literal: true

module AcademicPeriods
  # Validates the pre-closing checklist and transitions open → closing.
  class StartClosureService < ApplicationService
    def initialize(period:)
      @period = period
    end

    def call
      return ResponseService.failure(code: :invalid_closure_transition) unless period.closure_status == "open"

      checklist = ClosureChecklistService.call(
        period: period,
        stage: ClosureChecklistService::STAGE_PRE_CLOSING
      )
      return checklist unless checklist.success?

      unless checklist.data[:complete]
        return ResponseService.failure(
          code: :checklist_incomplete,
          details: { blockers: checklist.data[:blockers] }
        )
      end

      period.update!(closure_status: "closing")

      ResponseService.success(data: period.reload)
    end

    private

    attr_reader :period
  end
end
