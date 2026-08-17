# frozen_string_literal: true

module ReportCards
  # Audited correction republish for one student/period (BR-RC03, UC-RC02 republish).
  class RepublishService < ApplicationService
    def initialize(publication:, requested_by_membership:, correction_reason:)
      @publication = publication
      @requested_by_membership = requested_by_membership
      @correction_reason = correction_reason
    end

    def call
      return ResponseService.failure(code: :republish_reason_required) if correction_reason.blank?
      return ResponseService.failure(code: :report_card_not_ready, details: period_blockers) unless period_allows_correction?

      student = publication.student
      school_class = student.school_class
      config = ReportCardConfig.current_for(publication.school)
      return ResponseService.failure(code: :not_found, details: { config: [ "missing" ] }) if config.blank?

      readiness = ReadinessValidationService.call(
        school: publication.school,
        school_class: school_class,
        academic_period: publication.academic_period,
        students: [ student ],
        correction: true
      )
      return readiness if readiness.failure?

      staged = StageSnapshotService.call(
        student: student,
        school_class: school_class,
        academic_period: publication.academic_period,
        config: config,
        publication: publication,
        correction_reason: correction_reason
      )
      return staged if staged.failure?

      release_single!(staged.data)
    end

    private

    attr_reader :publication, :requested_by_membership, :correction_reason

    def period_allows_correction?
      publication.academic_period.closure_status == "closed" || publication.active_snapshot.present?
    end

    def period_blockers
      {
        blockers: [ {
          student_id: publication.student_id,
          code: "period_not_closed_for_correction",
          details: { closure_status: publication.academic_period.closure_status }
        } ]
      }
    end

    def release_single!(staged)
      released_at = Time.current
      snapshot = nil

      ActiveRecord::Base.transaction do
        snapshot = publication.report_card_snapshots.create!(
          school: publication.school,
          report_card_config: ReportCardConfig.current_for(publication.school),
          version: staged.version,
          supersedes_id: staged.supersedes_id,
          grade_launch_digest: staged.grade_launch_digest,
          snapshot: staged.snapshot_payload,
          correction_reason: correction_reason,
          released_at: released_at,
          pdf_storage_key: staged.pdf_storage_key
        )
        publication.update!(active_snapshot_id: snapshot.id)
      end

      EventEmitter.report_card_republished(snapshot: snapshot)

      ResponseService.success(
        data: {
          publication_id: publication.id,
          snapshot_id: snapshot.id,
          version: snapshot.version,
          released_at: released_at.iso8601,
          pdf_url: "/api/v1/schools/#{publication.school_id}/me/report_cards/#{publication.id}/snapshots/#{snapshot.id}/pdf"
        }
      )
    end
  end
end
