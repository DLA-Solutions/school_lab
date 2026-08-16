# frozen_string_literal: true

module Preceptorship
  # Starting a report, or working on one that is still a draft.
  #
  # One service for both because they are the same act: a teacher writing. Which record it lands
  # in is a detail of whether they started today or last Tuesday.
  class WriteReportService < ApplicationService
    def initialize(school:, teacher:, author:, params:, report: nil)
      @school = school
      @teacher = teacher
      @author = author
      @params = params
      @report = report
    end

    def call
      return ResponseService.failure(code: :not_found) if teacher.blank? && report.blank?

      record = report || PreceptorshipReport.new(school: school, teacher: teacher, author: author)

      unless record.editable?
        return ResponseService.failure(code: :invalid_state_transition)
      end

      record.assign_attributes(permitted_attributes)

      return ResponseService.failure(code: :validation_error, details: record.errors.to_hash) unless record.save

      ResponseService.success(data: record)
    end

    private

    attr_reader :school, :teacher, :author, :params, :report

    # The teacher, the school and the author are not writable: whose account this is, and which
    # school holds it, are settled by who is signed in — not by the body of the request.
    def permitted_attributes
      params.to_h.symbolize_keys.slice(:student_id, :academic_period_id, :body)
    end
  end
end
