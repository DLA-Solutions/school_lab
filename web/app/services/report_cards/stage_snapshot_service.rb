# frozen_string_literal: true

module ReportCards
  # Stages snapshot JSON and PDF bytes before the atomic release transaction.
  class StageSnapshotService < ApplicationService
    StagedSnapshot = Data.define(
      :student,
      :publication,
      :snapshot_payload,
      :grade_launch_digest,
      :pdf_storage_key,
      :pdf_bytes,
      :version,
      :supersedes_id,
      :correction_reason
    )

    def initialize(student:, school_class:, academic_period:, config:, batch: nil, publication: nil,
                   correction_reason: nil)
      @student = student
      @school_class = school_class
      @academic_period = academic_period
      @config = config
      @batch = batch
      @publication = publication
      @correction_reason = correction_reason
    end

    def call
      materialized = MaterializeSnapshotService.call(
        student: student,
        school_class: school_class,
        academic_period: academic_period,
        config: config
      )
      return materialized if materialized.failure?

      payload = materialized.data
      pdf_result = RenderSnapshotPdfService.call(
        snapshot_payload: payload,
        student_name: student.name,
        period_name: academic_period.name,
        school_name: school_class.school.name
      )
      return pdf_result if pdf_result.failure?

      publication_record = publication || find_or_build_publication
      version = next_version(publication_record)
      supersedes_id = publication_record.active_snapshot_id

      blob_key = upload_pdf!(pdf_result.data.fetch(:pdf))

      ResponseService.success(
        data: StagedSnapshot.new(
          student: student,
          publication: publication_record,
          snapshot_payload: payload,
          grade_launch_digest: payload.fetch(:grade_launch_digest),
          pdf_storage_key: blob_key,
          pdf_bytes: pdf_result.data.fetch(:pdf),
          version: version,
          supersedes_id: supersedes_id,
          correction_reason: correction_reason
        )
      )
    rescue ActiveStorage::Error => e
      Rails.logger.error({ event: "report_card.pdf_stage_failed", student_id: student.id, message: e.message }.to_json)
      ResponseService.failure(code: :batch_release_failed, details: { student_id: student.id })
    end

    private

    attr_reader :student, :school_class, :academic_period, :config, :batch, :publication, :correction_reason

    def find_or_build_publication
      ReportCardPublication.find_or_initialize_by(
        school_id: student.school_id,
        student: student,
        academic_period: academic_period
      ) do |record|
        record.created_by_membership = batch&.requested_by_membership || Current.membership
      end
    end

    def next_version(publication_record)
      (publication_record.report_card_snapshots.maximum(:version) || 0) + 1
    end

    def upload_pdf!(bytes)
      key = "report_cards/#{student.school_id}/#{SecureRandom.uuid}.pdf"
      ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new(bytes),
        filename: "report-card.pdf",
        content_type: "application/pdf",
        key: key
      )
      key
    end
  end
end
