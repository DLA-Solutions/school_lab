# frozen_string_literal: true

module Communication
  # Posts one text line on the child's private thread. Kind is always text — a routine card
  # is created only by sending the daily routine, never by this call.
  class PostMessageService < ApplicationService
    def initialize(school:, membership:, student:, body:, attachment_ids: [], client_request_id: nil)
      @school = school
      @membership = membership
      @student = student
      @body = body
      @attachment_ids = attachment_ids
      @client_request_id = client_request_id.presence
    end

    def call
      return ResponseService.failure(code: :not_found) unless student.school_id == school.id

      if (existing = idempotent_message)
        return ResponseService.success(data: { message: existing, created: false })
      end

      normalized = normalized_body
      ids = attachment_id_list
      return ResponseService.failure(code: ids) if ids.is_a?(Symbol)
      return ResponseService.failure(code: :empty_content) if normalized.nil? && ids.empty?
      return ResponseService.failure(code: :too_many_files) if ids.size > CommunicationAttachment::MAX_PER_OWNER

      message = nil
      created = false
      error = nil

      ActiveRecord::Base.transaction do
        conversation = EnsureKeptConversation.call(school: school, student: student)
        if (existing = existing_message(conversation))
          message = existing
          next
        end

        attachments = claimable_attachments(ids)
        if attachments.is_a?(Symbol)
          error = attachments
          raise ActiveRecord::Rollback
        end

        message, created = insert_message(conversation, attachments, normalized)
      end

      return ResponseService.failure(code: error) if error

      ResponseService.success(data: { message: message, created: created })
    end

    private

    attr_reader :school, :membership, :student, :body, :attachment_ids, :client_request_id

    def normalized_body
      body.to_s.strip.presence
    end

    def idempotent_message
      return if client_request_id.blank?

      conversation = Conversation.kept.find_by(school_id: school.id, student_id: student.id)
      return if conversation.nil?

      existing_message(conversation)
    end

    def existing_message(conversation)
      return if client_request_id.blank?

      conversation.messages.find_by(client_request_id: client_request_id)
    end

    def attachment_id_list
      raw = Array(attachment_ids)
      ids = raw.map { |id| Integer(id, exception: false) }
      return :not_found if ids.any?(&:nil?)

      ids.uniq
    end

    def claimable_attachments(ids)
      return [] if ids.empty?

      rows = locked_attachments(ids)
      return :not_found if rows.size != ids.size

      ordered = ids.map { |id| rows.fetch(id) }
      ordered.each do |attachment|
        return :not_found unless unclaimed_by_membership?(attachment)

        error = media_error(attachment)
        return error if error
      end
      ordered
    end

    def locked_attachments(ids)
      CommunicationAttachment.lock.where(id: ids).order(:id).index_by(&:id)
    end

    def unclaimed_by_membership?(attachment)
      attachment.school_id == school.id &&
        attachment.uploaded_by_membership_id == membership.id &&
        attachment.message_id.nil? &&
        attachment.daily_routine_id.nil?
    end

    def media_error(attachment)
      blob = attachment.file.blob
      return :unsupported_media_type if blob.nil?
      return :unsupported_media_type unless CommunicationAttachment::ALLOWED_CONTENT_TYPES.include?(blob.content_type)
      return :file_too_large if blob.byte_size > CommunicationAttachment::MAX_BYTE_SIZE

      nil
    end

    def insert_message(conversation, attachments, normalized)
      sent_at = Time.current
      message = Message.transaction(requires_new: true) do
        created_message = Message.create!(
          conversation: conversation,
          school: school,
          sender_membership: membership,
          kind: "text",
          body: normalized,
          client_request_id: client_request_id,
          sent_at: sent_at
        )
        attachments.each { |attachment| attachment.update!(message: created_message) }
        conversation.update!(last_message_at: sent_at)
        created_message
      end
      [ message, true ]
    rescue ActiveRecord::RecordNotUnique
      existing = existing_message(conversation)
      raise if existing.nil?

      [ existing, false ]
    end
  end
end
