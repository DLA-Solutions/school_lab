# frozen_string_literal: true

module Communication
  # Holds an upload until a message or a routine claims it. The client MIME is not stored:
  # Marcel names the bytes, and Active Storage is told not to sniff again so a spoofed
  # header cannot replace that decision.
  class CreateAttachmentService < ApplicationService
    def initialize(school:, membership:, file:)
      @school = school
      @membership = membership
      @file = file
    end

    def call
      return ResponseService.failure(code: :not_found) unless membership.school_id == school.id
      return ResponseService.failure(code: :unsupported_media_type) unless upload?
      return ResponseService.failure(code: :file_too_large) if over_size?

      content_type = identified_type
      rewind_upload
      unless CommunicationAttachment::ALLOWED_CONTENT_TYPES.include?(content_type)
        return ResponseService.failure(code: :unsupported_media_type)
      end

      attachment = CommunicationAttachment.new(school: school, uploaded_by_membership: membership)
      attachment.file.attach(io: file, filename: filename, content_type: content_type, identify: false)
      attachment.save!

      ResponseService.success(data: attachment)
    rescue ActiveRecord::RecordInvalid => e
      code = e.record.errors.added?(:file, :too_large) ? :file_too_large : :unsupported_media_type
      ResponseService.failure(code: code)
    end

    private

    attr_reader :school, :membership, :file

    def upload?
      file.present? &&
        file.respond_to?(:read) &&
        file.respond_to?(:size) &&
        file.respond_to?(:original_filename)
    end

    # Reject before the blob exists. `size` is the upload's own report, which may be stubbed
    # at the boundary without writing the bytes to disk.
    def over_size?
      file.respond_to?(:size) && !file.size.nil? && file.size > CommunicationAttachment::MAX_BYTE_SIZE
    end

    def identified_type
      Marcel::MimeType.for(file, name: filename, declared_type: declared_type)
    end

    def filename
      File.basename(file.original_filename.to_s).presence || "upload"
    end

    def declared_type
      return unless file.respond_to?(:content_type)

      file.content_type
    end

    def rewind_upload
      file.rewind if file.respond_to?(:rewind)
    end
  end
end
