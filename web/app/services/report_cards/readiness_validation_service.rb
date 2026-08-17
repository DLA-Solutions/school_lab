# frozen_string_literal: true

module ReportCards
  # Shared readiness checks for validate, publish, and republish flows (BR-RC05).
  class ReadinessValidationService < ApplicationService
    Blocker = Data.define(:student_id, :code, :details)

    def initialize(school:, school_class:, academic_period:, students:, force_publish_reason: nil,
                   correction: false)
      @school = school
      @school_class = school_class
      @academic_period = academic_period
      @students = students
      @force_publish_reason = force_publish_reason
      @correction = correction
    end

    def call
      blockers = students.flat_map { |student| student_blockers(student) }
      period_blockers = validate_period_state
      blockers += period_blockers if period_blockers.present?

      if blockers.any?
        return ResponseService.failure(
          code: :report_card_not_ready,
          details: { blockers: blockers.map(&:to_h) }
        )
      end

      ResponseService.success(data: { blockers: [] })
    end

    private

    attr_reader :school, :school_class, :academic_period, :students, :force_publish_reason, :correction

    def student_blockers(student)
      results = []
      results << blocker(student, "pending_attendance_confirmation", pending_session_ids) if pending_sessions.any?
      results.concat(grade_blockers_for(student))
      results.concat(attendance_blockers_for(student))
      results
    end

    def validate_period_state
      return [] if academic_period.school_id == school.id

      [ Blocker.new(student_id: nil, code: "period_school_mismatch", details: {}) ]
    end

    def grade_blockers_for(student)
      required_class_disciplines.filter_map do |discipline|
        launch = current_launch_for(discipline)
        next grade_blocker(student, "missing_grade_launch", discipline) if launch.blank?
        next grade_blocker(student, "invalidated_grade_launch", discipline, launch) if launch.invalidated?
        unless digest_matches?(discipline, launch)
          next grade_blocker(student, "grade_launch_digest_mismatch", discipline, launch)
        end

        nil
      end
    end

    def attendance_blockers_for(student)
      summary = Attendance::PeriodSummaryService.call(
        student: student,
        academic_period: academic_period,
        school_class: school_class
      )
      return [] if summary.success? && summary.data.instructional_sessions.positive?

      [ blocker(student, "attendance_summary_unavailable", {}) ]
    end

    def grade_blocker(student, code, discipline, launch = nil)
      details = {
        class_discipline_id: discipline.id,
        class_id: discipline.school_class_id,
        subject_id: discipline.subject_id
      }
      details[:grade_launch_id] = launch.id if launch
      details[:invalidation_reason] = launch.invalidation_reason if launch&.invalidated?
      blocker(student, code, details)
    end

    def blocker(student, code, details)
      Blocker.new(student_id: student.id, code: code, details: details)
    end

    def pending_sessions
      @pending_sessions ||= AttendanceSession.kept
                                             .where(school_id: school.id, academic_period: academic_period,
                                                    school_class: school_class)
                                             .pending_confirmation
    end

    def pending_session_ids
      pending_sessions.pluck(:id)
    end

    def required_class_disciplines
      @required_class_disciplines ||= ClassDiscipline.kept
                                                   .required_on_report_card
                                                   .where(school_id: school.id, school_class: school_class)
    end

    def current_launch_for(discipline)
      GradeLaunch.current.find_by(
        school_id: school.id,
        class_discipline: discipline,
        academic_period: academic_period
      )
    end

    def digest_matches?(discipline, launch)
      Grades::ComputeInputDigestService.call(
        class_discipline: discipline,
        academic_period: academic_period
      ).data[:digest] == launch.input_digest
    end
  end
end
