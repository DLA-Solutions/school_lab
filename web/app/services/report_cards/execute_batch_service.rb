# frozen_string_literal: true

module ReportCards
  # Atomic all-or-nothing class batch release (BR-RC12).
  class ExecuteBatchService < ApplicationService
    def initialize(batch:, schedule: nil)
      @batch = batch
      @schedule = schedule
    end

    def call
      return in_progress_failure if duplicate_execution?

      batch.update!(status: "processing") unless batch.status == "processing"
      students = roster_students
      config = current_config
      return config_missing_failure if config.blank?

      readiness = ReadinessValidationService.call(
        school: batch.school,
        school_class: batch.school_class,
        academic_period: batch.academic_period,
        students: students,
        force_publish_reason: batch.force_publish_reason
      )
      return mark_failed!(readiness.details[:blockers]) if readiness.failure?

      staged = students.map do |student|
        StageSnapshotService.call(
          student: student,
          school_class: batch.school_class,
          academic_period: batch.academic_period,
          config: config,
          batch: batch
        )
      end

      failed_stage = staged.find(&:failure?)
      return mark_failed!(stage_blockers(failed_stage)) if failed_stage

      release!(staged.map(&:data))
    end

    private

    attr_reader :batch, :schedule

    def duplicate_execution?
      false
    end

    def in_progress_failure
      ResponseService.failure(code: :publication_in_progress)
    end

    def config_missing_failure
      mark_failed!([ { code: "missing_report_card_config", details: {} } ])
    end

    def current_config
      ReportCardConfig.current_for(batch.school)
    end

    def roster_students
      batch.school_class.students.kept.order(:id)
    end

    def stage_blockers(result)
      [ {
        student_id: result.details[:student_id],
        code: result.error_code.to_s,
        details: result.details
      } ]
    end

    def mark_failed!(blockers)
      batch.update!(
        status: "failed",
        blockers: blockers,
        released_count: 0,
        failed_count: batch.requested_count,
        completed_at: Time.current
      )
      schedule&.update!(status: "failed")
      ResponseService.failure(code: :batch_release_failed, details: { blockers: blockers })
    end

    def release!(staged_snapshots)
      released_at = Time.current
      results = []

      ActiveRecord::Base.transaction do
        staged_snapshots.each do |staged|
          publication = staged.publication
          publication.created_by_membership ||= batch.requested_by_membership
          publication.save! if publication.new_record?

          snapshot = publication.report_card_snapshots.create!(
            school: batch.school,
            report_card_publish_batch: batch,
            report_card_config_id: current_config.id,
            version: staged.version,
            supersedes_id: staged.supersedes_id,
            grade_launch_digest: staged.grade_launch_digest,
            snapshot: staged.snapshot_payload,
            correction_reason: staged.correction_reason,
            released_at: released_at,
            pdf_storage_key: staged.pdf_storage_key
          )

          publication.update!(active_snapshot_id: snapshot.id)
          results << build_result(staged.student, publication, snapshot, released_at)
        end

        batch.update!(
          status: "completed",
          released_count: staged_snapshots.size,
          failed_count: 0,
          blockers: [],
          completed_at: released_at
        )
        schedule&.update!(status: "completed")
      end

      results.each do |result|
        snapshot = ReportCardSnapshot.find(result[:snapshot_id])
        if snapshot.version == 1
          EventEmitter.report_card_published(snapshot: snapshot)
        else
          EventEmitter.report_card_republished(snapshot: snapshot)
        end
      end

      batch.reload
      ResponseService.success(data: batch_payload(results))
    end

    def build_result(student, publication, snapshot, released_at)
      {
        student_id: student.id,
        publication_id: publication.id,
        snapshot_id: snapshot.id,
        version: snapshot.version,
        released_at: released_at.iso8601,
        pdf_url: pdf_path(publication.id, snapshot.id)
      }
    end

    def pdf_path(publication_id, snapshot_id)
      "/api/v1/schools/#{batch.school_id}/me/report_cards/#{publication_id}/snapshots/#{snapshot_id}/pdf"
    end

    def batch_payload(results)
      {
        batch_id: batch.id,
        schedule_id: schedule&.id,
        status: batch.status,
        atomic: true,
        class_id: batch.school_class_id,
        academic_period_id: batch.academic_period_id,
        scheduled_for: schedule&.scheduled_for&.iso8601,
        counts: {
          requested: batch.requested_count,
          released: batch.released_count,
          failed: batch.failed_count
        },
        results: results,
        blockers: batch.blockers
      }
    end
  end
end
