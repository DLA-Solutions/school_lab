# frozen_string_literal: true

class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :audience, :teacher_id, :last_message_at

  # The child's current class, read from the student — not stored on the conversation.
  field :school_class_id do |conversation|
    conversation.student.school_class_id
  end

  field :sender_line
end
