# frozen_string_literal: true

# A line on a family thread. Files on a routine card stay on the routine; a kind-routine
# message still lists those ids so the client can open them from the thread.
class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :conversation_id, :sender_membership_id, :body, :kind, :daily_routine_id, :sent_at

  field :attachment_ids do |message|
    ids = message.communication_attachments.map(&:id)
    if message.kind == "routine" && message.daily_routine
      ids.concat(message.daily_routine.communication_attachments.map(&:id))
    end
    ids
  end
end
