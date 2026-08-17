# frozen_string_literal: true

module ReportCards
  # Creates an immediate or scheduled class publish batch (UC-RC02).
  class CreateBatchService < ApplicationService
    def initialize(school:, school_class:, academic_period:, requested_by_membership:, scheduled_for: nil,
                   force_publish_reason: nil)
      @school = school
      @school_class = school_class
      @academic_period = academic_period
      @requested_by_membership = requested_by_membership
      @scheduled_for = scheduled_for
      @force_publish_reason = force_publish_reason
    end

    def call
      students = school_class.students.kept.order(:id)
      return ResponseService.failure(code: :validation_error, details: { class_id: [ "has no students" ] }) if students.none?

      period_state = validate_period_for_initial_publish!
      return period_state if period_state.failure?

      readiness = ReadinessValidationService.call(
        school: school,
        school_class: school_class,
        academic_period: academic_period,
        students: students,
        force_publish_reason: force_publish_reason
      )
      return readiness if readiness.failure?

      if scheduled_for.present?
        create_scheduled_batch(students)
      else
        create_immediate_batch(students)
      end
    end

    private

    attr_reader :school, :school_class, :academic_period, :requested_by_membership, :scheduled_for,
                :force_publish_reason

    def validate_period_for_initial_publish!
      return ResponseService.success if academic_period.closure_status == "closing"

      ResponseService.failure(
        code: :report_card_not_ready,
        details: {
          blockers: [ {
            student_id: nil,
            code: "period_not_closing",
            details: { closure_status: academic_period.closure_status }
          } ]
        }
      )
    end

    def create_immediate_batch(students)
      batch = ReportCardPublishBatch.create!(
        school: school,
        school_class: school_class,
        academic_period: academic_period,
        requested_by_membership: requested_by_membership,
        mode: "immediate",
        status: "processing",
        force_publish_reason: force_publish_reason,
        requested_count: students.size
      )

      ExecuteBatchService.call(batch: batch)
    end

    def create_scheduled_batch(students)
      batch = ReportCardPublishBatch.create!(
        school: school,
        school_class: school_class,
        academic_period: academic_period,
        requested_by_membership: requested_by_membership,
        mode: "scheduled",
        status: "scheduled",
        force_publish_reason: force_publish_reason,
        requested_count: students.size
      )

      utc_scheduled_for = parse_scheduled_for
      schedule = ReportCardPublishSchedule.create!(
        school: school,
        report_card_publish_batch: batch,
        scheduled_for: utc_scheduled_for,
        school_timezone: school.timezone,
        status: "scheduled"
      )

      job = ExecuteScheduledPublishJob.set(wait_until: utc_scheduled_for).perform_later(schedule.id, school.id)
      schedule.update!(queue_job_reference: job.job_id)

      ResponseService.success(
        data: {
          batch_id: batch.id,
          schedule_id: schedule.id,
          status: "scheduled",
          class_id: school_class.id,
          academic_period_id: academic_period.id,
          scheduled_for: utc_scheduled_for.iso8601,
          school_timezone: school.timezone,
          results: [],
          blockers: []
        }
      )
    end

    def parse_scheduled_for
      zone = ActiveSupport::TimeZone[school.timezone] || ActiveSupport::TimeZone[School::DEFAULT_TIMEZONE]
      zone.parse(scheduled_for.to_s).utc
    end
  end
end
