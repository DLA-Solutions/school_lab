# frozen_string_literal: true

module Communication
  # Copies one text into each enrolled child's own thread. A communication_attachments row
  # has a single message_id, so only the first new message claims the upload; every further
  # child gets a new row on the same blob.
  class PostClassNoticeService < ApplicationService
    def initialize(school:, membership:, school_class:, body:, attachment_ids: [], client_request_id: nil)
      @school = school
      @membership = membership
      @school_class = school_class
      @body = body
      @attachment_ids = attachment_ids
      @client_request_id = client_request_id.presence
    end

    def call
      return ResponseService.failure(code: :not_found) unless school_class.school_id == school.id

      normalized = normalized_body
      ids = attachment_id_list
      return ResponseService.failure(code: ids) if ids.is_a?(Symbol)
      return ResponseService.failure(code: :empty_content) if normalized.nil? && ids.empty?
      return ResponseService.failure(code: :too_many_files) if ids.size > CommunicationAttachment::MAX_PER_OWNER

      messages = []
      created = false
      error = nil

      ActiveRecord::Base.transaction do
        # Lock threads before attachment rows. PostMessage uses that same order.
        locked = recipients.map do |student|
          [ student, EnsureKeptConversation.call(school: school, student: student) ]
        end

        sources = resolve_sources(ids)
        if sources.is_a?(Symbol)
          error = sources
          raise ActiveRecord::Rollback
        end

        claim_originals = true
        locked.each do |_student, conversation|
          message, inserted = deliver(conversation, normalized, sources, claim_originals)
          claim_originals = false if inserted
          created = true if inserted
          messages << message
        end
      end

      return ResponseService.failure(code: error) if error

      ordered = messages.sort_by { |message| message.conversation.student_id }
      ResponseService.success(data: { messages: ordered, created: created })
    end

    private

    attr_reader :school, :membership, :school_class, :body, :attachment_ids, :client_request_id

    def normalized_body
      body.to_s.strip.presence
    end

    def recipients
      Student.kept.where(school_id: school.id, school_class_id: school_class.id, status: "active").order(:id)
    end

    def attachment_id_list
      raw = Array(attachment_ids)
      ids = raw.map { |id| Integer(id, exception: false) }
      return :not_found if ids.any?(&:nil?)

      ids.uniq
    end

    def resolve_sources(ids)
      return [] if ids.empty?

      rows = CommunicationAttachment.lock.where(id: ids).order(:id).index_by(&:id)
      return :not_found if rows.size != ids.size

      ids.each do |id|
        attachment = rows.fetch(id)
        return :not_found unless reusable_source?(attachment)

        error = media_error(attachment)
        return error if error
      end

      ids.map { |id| rows.fetch(id) }
    end

    # Unattached uploads are claimed by the first new copy. A row already on a message is
    # reusable only when that message is an earlier copy of this same notice — otherwise a
    # private send or a routine would leak into the class.
    def reusable_source?(attachment)
      return false unless attachment.school_id == school.id
      return false unless attachment.uploaded_by_membership_id == membership.id
      return false if attachment.daily_routine_id.present?
      return true if attachment.message_id.nil?

      message = Message.find_by(id: attachment.message_id)
      client_request_id.present? &&
        message&.client_request_id == client_request_id &&
        message.school_id == school.id
    end

    def media_error(attachment)
      blob = attachment.file.blob
      return :unsupported_media_type if blob.nil?
      return :unsupported_media_type unless CommunicationAttachment::ALLOWED_CONTENT_TYPES.include?(blob.content_type)
      return :file_too_large if blob.byte_size > CommunicationAttachment::MAX_BYTE_SIZE

      nil
    end

    def deliver(conversation, normalized, sources, claim_originals)
      existing = existing_message(conversation)
      return [ existing, false ] if existing

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
        attach_sources!(created_message, sources, claim_originals)
        conversation.update!(last_message_at: sent_at)
        created_message
      end
      [ message, true ]
    rescue ActiveRecord::RecordNotUnique
      sources.each(&:reload)
      existing = existing_message(conversation)
      raise if existing.nil?

      [ existing, false ]
    end

    def existing_message(conversation)
      return if client_request_id.blank?

      conversation.messages.find_by(client_request_id: client_request_id)
    end

    def attach_sources!(message, sources, claim_originals)
      sources.each do |source|
        if claim_originals && source.message_id.nil? && source.daily_routine_id.nil?
          source.update!(message: message)
        else
          copy_attachment!(source, message)
        end
      end
    end

    def copy_attachment!(source, message)
      copy = CommunicationAttachment.new(
        school: school,
        uploaded_by_membership: membership,
        message: message
      )
      copy.file.attach(source.file.blob)
      copy.save!
    end
  end
end
