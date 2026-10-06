# frozen_string_literal: true

class ConversationBlueprint < Blueprinter::Base
  identifier :id

  field :student_id

  field :student_name do |conversation|
    conversation.student.name
  end

  fields :audience, :teacher_id

  field :teacher_name do |conversation|
    conversation.teacher&.name if conversation.teacher_audience?
  end

  field :last_message_at

  field :last_message_body do |conversation|
    conversation.last_speaker_message&.body
  end

  # The child's current class, read from the student — not stored on the conversation.
  field :school_class_id do |conversation|
    conversation.student.school_class_id
  end

  # Family identity. The roster keeps Conversation#sender_line, which names the last speaker.
  field :sender_line do |conversation|
    conversation.family_sender_line
  end
end
