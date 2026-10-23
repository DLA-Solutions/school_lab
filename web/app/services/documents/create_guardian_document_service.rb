# frozen_string_literal: true

module Documents
  # "Meus documentos": a guardian sending a document about one of their children. The document
  # belongs to the child, not to the parent who sent it, so every other kept guardian of that
  # child sees the same list. It is accepted automatically: created `approved`, with no review queue
  # (staff inactivate a wrong one instead, see DiscardDocumentService).
  #
  # Kept apart from CreateDocumentService on purpose: staff pick any documentable and any type,
  # while a guardian may only reach children linked to them and only the closed type list.
  class CreateGuardianDocumentService < ApplicationService
    ALLOWED_CONTENT_TYPES = %w[application/pdf image/jpeg image/png].freeze
    MAX_FILE_BYTES = 10.megabytes

    def initialize(school:, guardian:, actor:, params:, file:)
      @school = school
      @guardian = guardian
      @actor = actor
      @params = params
      @file = file
    end

    def call
      student = linked_student
      # Unlinked, discarded and other-school children look the same from outside.
      return ResponseService.failure(code: :not_found) unless student
      return ResponseService.failure(code: :student_inactive) unless student.enrolled?

      invalid = invalid_input
      return invalid if invalid

      document = school.documents.build(
        document_type: params[:document_type],
        documentable: student,
        uploaded_by: actor,
        reviewed_at: Time.current
      )
      document.file.attach(file)

      # A parent's upload is accepted on the spot (BR-ARC18): no review queue. The state machine
      # still owns the transition, so it is stored and approved in one transaction.
      ActiveRecord::Base.transaction do
        document.save!
        document.approve!
      end

      ResponseService.success(data: document)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :guardian, :actor, :params, :file

    def linked_student
      return if guardian.blank?

      guardian.students.kept.where(school_id: school.id).find_by(id: params[:student_id])
    end

    def invalid_input
      unless Document::GUARDIAN_DOCUMENT_TYPES.include?(params[:document_type])
        return ResponseService.failure(
          code: :validation_error,
          details: { document_type: [ I18n.t("errors.messages.inclusion") ] }
        )
      end

      unless uploaded_file?
        return ResponseService.failure(
          code: :validation_error,
          details: { file: [ I18n.t("errors.messages.blank") ] }
        )
      end

      return ResponseService.failure(code: :file_too_large) if file.size > MAX_FILE_BYTES
      return ResponseService.failure(code: :unsupported_media_type) unless allowed_content_type?

      nil
    end

    def uploaded_file?
      file.respond_to?(:original_filename) && file.respond_to?(:tempfile) && file.respond_to?(:size)
    end

    # Sniffed from the bytes alone. The filename and the client's declared type are left out on
    # purpose: Marcel falls back to them when the bytes say nothing, so renaming a text file or an
    # executable to .pdf would otherwise get it past the allowlist.
    def allowed_content_type?
      io = file.tempfile
      detected = Marcel::MimeType.for(io)
      io.rewind
      ALLOWED_CONTENT_TYPES.include?(detected)
    end
  end
end
