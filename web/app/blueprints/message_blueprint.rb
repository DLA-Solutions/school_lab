# frozen_string_literal: true

class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :sender_membership_id, :sender_line, :body, :sent_at
end
