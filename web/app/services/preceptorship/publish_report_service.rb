# frozen_string_literal: true

module Preceptorship
  # Handing the report to the family.
  #
  # This is the only moment that matters to a guardian: before it, the report does not exist as
  # far as they are concerned; after it, it cannot be taken back. See the state machine for why
  # there is no way to unpublish.
  class PublishReportService < ApplicationService
    def initialize(report:)
      @report = report
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless report.may_publish?

      # An empty report published is worse than no report: it tells a family the school had
      # nothing to say about their child, which is never what was meant.
      if report.body.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { body: [ I18n.t("errors.messages.blank") ] }
        )
      end

      report.published_at = Time.current
      report.publish!

      ResponseService.success(data: report)
    end

    private

    attr_reader :report
  end
end
