# frozen_string_literal: true

module Documents
  module Compliance
    # Stores one of the school's own regulatory files (BC5 "Compliance"). The row is a regular
    # `documents` record owned by the School itself and `approved` from the start: there is no
    # review step for something staff upload about their own school.
    #
    # Kept apart from CreateDocumentService on purpose: that one takes any documentable and any
    # type and leaves the document `pending`; this one fixes the owner to the school and the type
    # to the closed catalog. File limits are the archive's (the guardian upload's today).
    class CreateService < ApplicationService
      ALLOWED_CONTENT_TYPES = Documents::CreateGuardianDocumentService::ALLOWED_CONTENT_TYPES
      MAX_FILE_BYTES = Documents::CreateGuardianDocumentService::MAX_FILE_BYTES

      def initialize(school:, actor:, params:, file:)
        @school = school
        @actor = actor
        @params = params
        @file = file
      end

      def call
        invalid = invalid_input
        return invalid if invalid

        document = school.documents.build(
          document_type: params[:document_type],
          documentable: school,
          uploaded_by: actor
        )
        document.file.attach(file)

        save_approved(document)
      end

      private

      attr_reader :school, :actor, :params, :file

      def save_approved(document)
        saved = ActiveRecord::Base.transaction do
          document.save && approve(document)
        end

        if saved
          ResponseService.success(data: document)
        else
          ResponseService.failure(code: :validation_error, details: document.errors.to_hash)
        end
      end

      # Both writes stand or fall together: a half-saved file would sit `pending` and drop out of
      # the compliance list.
      def approve(document)
        document.reviewed_at = Time.current
        document.approve!
        true
      end

      def invalid_input
        unless Document::COMPLIANCE_DOCUMENT_TYPES.include?(params[:document_type])
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

      # Sniffed from the bytes alone, like the guardian upload: a renamed text file or executable
      # must not get past the allowlist on its filename or declared type.
      def allowed_content_type?
        io = file.tempfile
        detected = Marcel::MimeType.for(io)
        io.rewind
        ALLOWED_CONTENT_TYPES.include?(detected)
      end
    end
  end
end
