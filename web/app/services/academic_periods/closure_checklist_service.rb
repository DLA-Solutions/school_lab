# frozen_string_literal: true

module AcademicPeriods
  # Computes pre-closing or final-close checklist blockers for a period.
  class ClosureChecklistService < ApplicationService
    STAGE_PRE_CLOSING = "pre_closing"
    STAGE_FINAL_CLOSE = "final_close"

    def initialize(period:, stage: STAGE_PRE_CLOSING)
      @period = period
      @stage = stage
    end

    def call
      blockers = grade_launch_blockers + attendance_blockers
      blockers += final_close_blockers if stage == STAGE_FINAL_CLOSE

      ResponseService.success(
        data: {
          period_id: period.id,
          closure_status: period.closure_status,
          stage: stage,
          complete: blockers.empty?,
          blockers: blockers
        }
      )
    end

    private

    attr_reader :period, :stage

    def grade_launch_blockers
      required_disciplines.filter_map do |discipline|
        launch = current_launch_for(discipline)
        next missing_launch_blocker(discipline) if launch.blank?
        next invalidated_launch_blocker(discipline, launch) if launch.invalidated?
        next digest_mismatch_blocker(discipline, launch) unless digest_matches?(discipline, launch)

        nil
      end
    end

    def attendance_blockers
      pending_sessions = AttendanceSession.kept
                                          .where(school_id: period.school_id, academic_period: period)
                                          .pending_confirmation
      return [] if pending_sessions.none?

      [ {
        code: "pending_attendance_confirmation",
        message: "Attendance sessions awaiting confirmation",
        session_ids: pending_sessions.pluck(:id)
      } ]
    end

    def final_close_blockers
      # Report-card publication verification is deferred to report-cards BC.
      []
    end

    def required_disciplines
      ClassDiscipline.kept
                     .required_on_report_card
                     .joins(:school_year)
                     .where(school_id: period.school_id, school_years: { id: period.school_year_id })
    end

    def current_launch_for(discipline)
      GradeLaunch.current.find_by(
        school_id: period.school_id,
        class_discipline: discipline,
        academic_period: period
      )
    end

    def digest_matches?(discipline, launch)
      Grades::ComputeInputDigestService.call(
        class_discipline: discipline,
        academic_period: period
      ).data[:digest] == launch.input_digest
    end

    def missing_launch_blocker(discipline)
      {
        code: "missing_grade_launch",
        class_discipline_id: discipline.id,
        class_id: discipline.school_class_id,
        subject_id: discipline.subject_id
      }
    end

    def invalidated_launch_blocker(discipline, launch)
      {
        code: "invalidated_grade_launch",
        class_discipline_id: discipline.id,
        grade_launch_id: launch.id,
        invalidation_reason: launch.invalidation_reason
      }
    end

    def digest_mismatch_blocker(discipline, launch)
      {
        code: "grade_launch_digest_mismatch",
        class_discipline_id: discipline.id,
        grade_launch_id: launch.id
      }
    end
  end
end
