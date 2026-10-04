# frozen_string_literal: true

# One row per child the caller may see. The thread itself may not exist yet, so this is not
# a conversation record: conversation_id and last_message_at stay null until the first send.
class FamilyThreadBlueprint < Blueprinter::Base
  field :student_id do |student|
    student.id
  end

  field :student_name do |student|
    student.name
  end

  field :school_class_id

  field :conversation_id do |student, options|
    options.fetch(:conversations_by_student_id)[student.id]&.id
  end

  field :last_message_at do |student, options|
    options.fetch(:conversations_by_student_id)[student.id]&.last_message_at
  end
end
